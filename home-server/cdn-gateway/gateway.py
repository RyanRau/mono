"""CDN Gateway: the shared file store for every app -- a cached file server
in front of a NAS directory, with on-the-fly image thumbnails. Who may read
or change each file is decided per file by PocketBase (cdn_files'
owner/visibility/shared_with, see apps/pocketbase/pb_hooks/cdn.pb.js);
public files are served to anyone.

Run: python3 gateway.py --config config.yaml
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import sqlite3
import sys
import time
from contextlib import asynccontextmanager
from typing import Optional
from urllib.parse import unquote

import httpx
import uvicorn
import yaml
from fastapi import Body, Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

from library import (
    APP_SLUG_RE,
    ServiceClient,
    describe,
    guess_mime,
    is_ignored,
    kind_for,
)

CONFIG: dict = {}

# pb_auth is the cookie every *.ryanzrau.dev app's CookieAuthStore writes
# (see apps/tony/src/CookieAuthStore.ts) -- scoped to .ryanzrau.dev, so a
# plain <img src="https://cdn.ryanzrau.dev/..."> on any of those apps sends
# the signed-in user's session with no JavaScript involved. Reads only:
# the write routes under /api/ require an Authorization header, which a
# cross-site form or <img> can't send, so they need no CSRF protection.
AUTH_COOKIE = "pb_auth"

# Every file response gets this. Files come off the NAS as-is, so an .html
# or .svg in the library would otherwise run script on cdn.ryanzrau.dev --
# an origin that can read the (deliberately non-HttpOnly) pb_auth cookie.
# `sandbox` gives such a document an opaque origin with scripts disabled;
# images and video still render normally.
CSP = "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox"

# Only our own apps (and local dev) ever fetch() from here -- the admin
# page on ryanzrau.dev for the /api/ routes. <img>/<video> need no CORS.
CORS_ORIGIN_REGEX = (
    r"https://([a-z0-9-]+\.)*ryanzrau\.dev|http://(localhost|127\.0\.0\.1)(:\d+)?"
)

THUMB_MIME = "image/webp"

# A cache entry (sha256 hex) or an in-progress write of one.
CACHE_FILE_RE = re.compile(r"[0-9a-f]{64}(\.\d+\.\d+\.tmp)?")

# Where DELETE moves things, under the library root. A dot-directory, so
# the gateway never serves it and the indexer never indexes it.
TRASH_DIR = ".trash"


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        cfg = yaml.safe_load(f)
    cfg["library"]["root"] = os.path.realpath(
        os.path.expanduser(cfg["library"]["root"])
    )
    cfg["cache"]["dir"] = os.path.realpath(os.path.expanduser(cfg["cache"]["dir"]))
    root, cache_dir = cfg["library"]["root"], cfg["cache"]["dir"]
    if os.path.commonpath([root, cache_dir]) in (root, cache_dir):
        sys.exit("cache.dir and library.root must not contain one another")
    return cfg


def clean_rel(rel: str, status: int = 404, allow_root: bool = False) -> str:
    """Normalizes a library-relative path from a URL or request body.
    Rejects `..`, hidden/ignored segments and anything else that isn't a
    plain name. Pure string work, so it runs before the auth check without
    revealing whether anything exists. Reads fail with 404 (probing reveals
    nothing); writes pass 400 so the admin page can show why."""
    parts = [p for p in rel.split("/") if p]
    for p in parts:
        if (
            p in (".", "..")
            or is_ignored(p)
            or "\\" in p
            or "\0" in p
            or len(p.encode()) > 255
        ):
            raise HTTPException(status, "Not found" if status == 404 else "Bad path")
    if not parts and not allow_root:
        raise HTTPException(status, "Not found" if status == 404 else "Bad path")
    return "/".join(parts)


def abs_for(rel: str, status: int = 404) -> str:
    """The absolute path for a clean relative path. Also catches a symlink
    inside the library that points outside it. Works for paths that don't
    exist yet (upload, mkdir and move destinations)."""
    root = CONFIG["library"]["root"]
    abs_path = os.path.realpath(os.path.join(root, rel))
    if os.path.commonpath([root, abs_path]) != root:
        raise HTTPException(status, "Not found" if status == 404 else "Bad path")
    return abs_path


def real_rel(rel: str) -> str:
    """The library-relative path a clean relative path actually resolves
    to. Differs from `rel` only through a symlink. A public path must be
    public by both names, so a link inside a public folder can't publish
    a private file; anything resolving outside the library comes back as
    a path no rule covers."""
    root = CONFIG["library"]["root"]
    return os.path.relpath(os.path.realpath(os.path.join(root, rel)), root).replace(
        os.sep, "/"
    )


def literal_for(rel: str, status: int = 400) -> str:
    """Like abs_for, but the path itself rather than its symlink-resolved
    target -- what move and delete act on, so they move a link, not the
    file it points to. Still checked with abs_for first."""
    abs_for(rel, status)
    return os.path.join(CONFIG["library"]["root"], rel)


class Authorizer:
    """Answers "may the holder of this PocketBase session token do X" by
    forwarding the token to PocketBase's POST /api/custom/cdn/authorize
    (apps/pocketbase/pb_hooks/cdn.pb.js), which authenticates it as that
    user's own session -- the same trick as llm-gateway's resolve_session.
    The gateway's service account is never used for these decisions.

    Two layers, both cached (allows for session_cache_seconds, denials for
    a few seconds) with concurrent identical lookups sharing one request:
      - session(token): who this is and whether they're an admin. Admins
        skip the per-file checks entirely.
      - allowed(token, op, key): a per-file (or per-app, for uploads)
        answer for everyone else. A thumbnail grid costs one check per
        distinct file on first view, then nothing until the cache expires.
    Fails closed: PocketBase unreachable means denied, though answers
    already cached keep working until they expire.
    """

    DENY_TTL = 5

    def __init__(self, cfg: dict):
        auth_cfg = cfg["auth"]
        self.allow_ttl = auth_cfg.get("session_cache_seconds", 60)
        self._cache: dict[str, tuple[Optional[dict], float]] = {}
        self._inflight: dict[str, asyncio.Future] = {}
        self._client = httpx.AsyncClient(
            base_url=auth_cfg["pocketbase_url"].rstrip("/"), timeout=10
        )

    async def stop(self):
        await self._client.aclose()

    @staticmethod
    def bearer_from(request: Request) -> Optional[str]:
        header = request.headers.get("authorization", "")
        if header.lower().startswith("bearer "):
            return header[7:].strip() or None
        return None

    @staticmethod
    def token_from(request: Request) -> Optional[str]:
        token = Authorizer.bearer_from(request)
        if token:
            return token
        cookie = request.cookies.get(AUTH_COOKIE)
        if not cookie:
            return None
        try:
            return json.loads(unquote(cookie)).get("token") or None
        except (ValueError, AttributeError):
            return None

    async def session(self, token: str) -> Optional[dict]:
        """{"admin", "user_id"} for a valid user session, else None."""
        answer = await self._ask(token, "session", "")
        return answer if answer and answer["allowed"] else None

    async def allowed(self, token: str, op: str, key: str) -> bool:
        session = await self.session(token)
        if not session:
            return False
        if session["admin"]:
            return True
        answer = await self._ask(token, op, key)
        return bool(answer and answer["allowed"])

    async def _ask(self, token: str, op: str, key: str) -> Optional[dict]:
        cache_key = hashlib.sha256(f"{token}\0{op}\0{key}".encode()).hexdigest()
        now = time.time()
        cached = self._cache.get(cache_key)
        if cached and cached[1] > now:
            return cached[0]
        if cache_key in self._inflight:
            return await asyncio.shield(self._inflight[cache_key])

        future = asyncio.get_running_loop().create_future()
        self._inflight[cache_key] = future
        try:
            answer = await self._ask_pocketbase(token, op, key)
            ttl = self.allow_ttl if answer and answer["allowed"] else self.DENY_TTL
            if len(self._cache) > 50_000:
                self._cache = {k: e for k, e in self._cache.items() if e[1] > now}
            self._cache[cache_key] = (answer, now + ttl)
            future.set_result(answer)
            return answer
        except BaseException:
            # Only cancellation gets here (_ask_pocketbase turns every HTTP
            # failure into a denial); waiters see the same cancellation.
            future.cancel()
            raise
        finally:
            del self._inflight[cache_key]

    async def _ask_pocketbase(self, token: str, op: str, key: str) -> Optional[dict]:
        body = {"op": op, "app" if op == "upload" else "path": key}
        try:
            r = await self._client.post(
                "/api/custom/cdn/authorize",
                json=body,
                headers={"Authorization": f"Bearer {token}"},
            )
        except httpx.HTTPError as e:
            print(f"[cdn] authorize failed (network), denying: {e}")
            return None
        if r.status_code != 200:
            return None
        return r.json()


class PublicRules:
    """Everything anyone may read without signing in -- cdn_public rules
    plus every file whose visibility is "public" -- pulled from PocketBase
    every public_refresh_seconds, with the same deny-by-default
    shape as llm-gateway's key cache: a path is public only if the last
    successful pull said so. Starts empty, so nothing is public until the
    first pull lands; a PocketBase outage keeps the last known-good rules,
    and a revoked share stops working within one refresh."""

    def __init__(self, service: ServiceClient, interval: int):
        self.service = service
        self.interval = interval
        self.files: set[str] = set()
        self.folders: list[str] = []
        self._task: Optional[asyncio.Task] = None

    def start(self):
        self._task = asyncio.create_task(self._loop())

    async def stop(self):
        if self._task:
            self._task.cancel()

    def covers(self, rel: str) -> bool:
        return rel in self.files or any(rel.startswith(f + "/") for f in self.folders)

    async def refresh(self):
        data = await asyncio.to_thread(
            self.service.request, "GET", "/api/custom/cdn/public-paths"
        )
        self.files = {r["path"] for r in data["rules"] if not r["folder"]}
        self.folders = [r["path"] for r in data["rules"] if r["folder"]]

    async def _loop(self):
        while True:
            try:
                await self.refresh()
            except httpx.HTTPError as e:
                print(f"[cdn] public rules refresh failed, keeping cached: {e}")
            await asyncio.sleep(self.interval)


class Cache:
    """Size-bounded LRU of files copied off the NAS (originals) or rendered
    from them (thumbnails), on local disk. The index is a SQLite file in the
    cache dir, so a restart keeps a warm cache.

    Each entry remembers the source file's (size, mtime) at fill time. A hit
    younger than revalidate_seconds is served without touching the NAS at
    all; an older one re-stats the source (a metadata call, not a read) and
    only re-fills if the file actually changed. If the NAS is unreachable,
    a stale entry is still served rather than failing. Changes made through
    this gateway (move, delete, overwrite) drop the affected entries at
    once, via drop_path.
    """

    def __init__(self, cfg: dict):
        cache_cfg = cfg["cache"]
        self.dir = cache_cfg["dir"]
        self.max_bytes = int(cache_cfg.get("max_gb", 20) * 1024**3)
        self.revalidate = cache_cfg.get("revalidate_seconds", 300)
        os.makedirs(self.dir, exist_ok=True)
        self.db = sqlite3.connect(
            os.path.join(self.dir, "index.sqlite3"), isolation_level=None
        )
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=NORMAL")
        columns = [r[1] for r in self.db.execute("PRAGMA table_info(entries)")]
        if columns and "rel" not in columns:
            # Index from before entries recorded their path; _reconcile
            # below clears out the now-unindexed files.
            self.db.execute("DROP TABLE entries")
        self.db.execute(
            """CREATE TABLE IF NOT EXISTS entries (
                key TEXT PRIMARY KEY,
                rel TEXT NOT NULL,
                src_size INTEGER NOT NULL,
                src_mtime REAL NOT NULL,
                bytes INTEGER NOT NULL,
                content_type TEXT NOT NULL,
                validated_at REAL NOT NULL,
                last_access REAL NOT NULL
            )"""
        )
        self.db.execute(
            "CREATE INDEX IF NOT EXISTS idx_entries_access ON entries (last_access)"
        )
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_entries_rel ON entries (rel)")
        self._reconcile()
        self.total_bytes = self.db.execute(
            "SELECT COALESCE(SUM(bytes), 0) FROM entries"
        ).fetchone()[0]
        self._locks: dict[str, list] = {}  # key -> [lock, holders+waiters]

    def _reconcile(self):
        """Drops index rows whose file is gone and files (including
        half-written .tmp ones from a crash) with no index row. Only ever
        deletes files named like cache entries, so a mistyped cache.dir
        can't take anything else with it."""
        known = set()
        for (key,) in self.db.execute("SELECT key FROM entries").fetchall():
            if os.path.exists(self.path_for(key)):
                known.add(key)
            else:
                self.db.execute("DELETE FROM entries WHERE key = ?", (key,))
        for dirpath, _, filenames in os.walk(self.dir):
            if dirpath == self.dir:
                continue
            for name in filenames:
                if CACHE_FILE_RE.fullmatch(name) and name not in known:
                    os.remove(os.path.join(dirpath, name))

    @staticmethod
    def key_for(rel: str, variant: str) -> str:
        return hashlib.sha256(f"{rel}\0{variant}".encode()).hexdigest()

    def path_for(self, key: str) -> str:
        return os.path.join(self.dir, key[:2], key[2:4], key)

    @asynccontextmanager
    async def locked(self, key: str):
        """Serializes work on one cache key, so N simultaneous requests for
        an uncached file trigger one NAS read, not N. The lock is dropped
        once nobody holds or waits on it, so this doesn't grow per key
        ever requested."""
        slot = self._locks.setdefault(key, [asyncio.Lock(), 0])
        slot[1] += 1
        try:
            async with slot[0]:
                yield
        finally:
            slot[1] -= 1
            if slot[1] == 0:
                del self._locks[key]

    def get(self, key: str) -> Optional[dict]:
        row = self.db.execute(
            "SELECT src_size, src_mtime, content_type, validated_at FROM entries WHERE key = ?",
            (key,),
        ).fetchone()
        if not row:
            return None
        return {
            "src_size": row[0],
            "src_mtime": row[1],
            "content_type": row[2],
            "validated_at": row[3],
        }

    def touch(self, key: str, validated: bool = False):
        now = time.time()
        if validated:
            self.db.execute(
                "UPDATE entries SET last_access = ?, validated_at = ? WHERE key = ?",
                (now, now, key),
            )
        else:
            self.db.execute(
                "UPDATE entries SET last_access = ? WHERE key = ?", (now, key)
            )

    def put(
        self,
        key: str,
        rel: str,
        tmp_path: str,
        src: os.stat_result,
        content_type: str,
    ):
        """Moves an already-written temp file into place and indexes it."""
        size = os.path.getsize(tmp_path)
        dest = self.path_for(key)
        os.replace(tmp_path, dest)
        old = self.db.execute(
            "SELECT bytes FROM entries WHERE key = ?", (key,)
        ).fetchone()
        now = time.time()
        self.db.execute(
            "INSERT OR REPLACE INTO entries VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (key, rel, src.st_size, src.st_mtime, size, content_type, now, now),
        )
        self.total_bytes += size - (old[0] if old else 0)
        self._evict()

    def drop(self, key: str):
        row = self.db.execute(
            "SELECT bytes FROM entries WHERE key = ?", (key,)
        ).fetchone()
        if not row:
            return
        self.db.execute("DELETE FROM entries WHERE key = ?", (key,))
        self.total_bytes -= row[0]
        try:
            os.remove(self.path_for(key))
        except FileNotFoundError:
            pass

    def drop_path(self, rel: str):
        """Every variant of a file, or of everything under a folder."""
        escaped = rel.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        rows = self.db.execute(
            "SELECT key FROM entries WHERE rel = ? OR rel LIKE ? ESCAPE '\\'",
            (rel, escaped + "/%"),
        ).fetchall()
        for (key,) in rows:
            self.drop(key)

    def tmp_path_for(self, key: str) -> str:
        dest = self.path_for(key)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        return f"{dest}.{os.getpid()}.{time.monotonic_ns()}.tmp"

    def _evict(self):
        # Evict down to 90% so a full cache doesn't evict on every fill.
        if self.total_bytes <= self.max_bytes:
            return
        target = self.max_bytes * 0.9
        for key, size in self.db.execute(
            "SELECT key, bytes FROM entries ORDER BY last_access"
        ).fetchall():
            if self.total_bytes <= target:
                break
            self.drop(key)

    def stats(self) -> dict:
        count = self.db.execute("SELECT COUNT(*) FROM entries").fetchone()[0]
        return {
            "entries": count,
            "bytes": self.total_bytes,
            "max_bytes": self.max_bytes,
        }


class ThumbnailError(Exception):
    """The source was readable but isn't an image Pillow can render."""


def render_thumbnail(src_path: str, dest_path: str, width: int, quality: int):
    # Opened separately so a NAS I/O failure stays an OSError (-> 503/stale)
    # while anything Pillow chokes on becomes a ThumbnailError (-> 415).
    with open(src_path, "rb") as f:
        try:
            with Image.open(f) as img:
                # JPEG-only fast path: decode at a reduced scale instead of
                # full resolution and then shrinking. A no-op otherwise.
                img.draft("RGB", (width, width))
                img = ImageOps.exif_transpose(img)
                if img.mode not in ("RGB", "RGBA"):
                    img = img.convert("RGBA" if img.has_transparency_data else "RGB")
                if img.width > width:
                    height = max(1, round(img.height * width / img.width))
                    img = img.resize((width, height), Image.Resampling.LANCZOS)
                img.save(dest_path, "WEBP", quality=quality, method=4)
        except Exception as e:
            raise ThumbnailError(str(e)) from e


cache: Optional[Cache] = None
auth: Optional[Authorizer] = None
service: Optional[ServiceClient] = None
public_rules: Optional[PublicRules] = None
thumb_slots: Optional[asyncio.Semaphore] = None


async def stat_source(abs_path: str) -> os.stat_result:
    """os.stat on the NAS mount, off the event loop and time-boxed -- an
    asleep or disconnected SMB/NFS mount can block a stat for a long time."""
    timeout = CONFIG["library"].get("stat_timeout_seconds", 5)
    return await asyncio.wait_for(asyncio.to_thread(os.stat, abs_path), timeout)


async def library_mounted() -> bool:
    """An unmounted share is usually just an empty (or absent) mount point,
    which makes every file in it look deleted. Anything that 404s is
    double-checked against this before the cache forgets it, and every
    write refuses to run without it."""
    root = CONFIG["library"]["root"]
    timeout = CONFIG["library"].get("stat_timeout_seconds", 5)
    try:
        listing = await asyncio.wait_for(asyncio.to_thread(os.listdir, root), timeout)
    except (OSError, asyncio.TimeoutError):
        return False
    return bool(listing)


async def fill(
    key: str, rel: str, abs_path: str, src: os.stat_result, width: Optional[int]
) -> str:
    tmp = cache.tmp_path_for(key)
    try:
        if width is None:
            content_type = guess_mime(abs_path)
            await asyncio.to_thread(shutil.copyfile, abs_path, tmp)
        else:
            content_type = THUMB_MIME
            quality = CONFIG["thumbnails"].get("quality", 80)
            async with thumb_slots:
                await asyncio.to_thread(render_thumbnail, abs_path, tmp, width, quality)
        cache.put(key, rel, tmp, src, content_type)
        return content_type
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def file_response(
    path: str, content_type: str, cache_status: str, public: bool
) -> FileResponse:
    if public:
        # Shared caches may keep it too; kept short so revoking a share
        # takes effect in reasonable time even for someone who's seen it.
        seconds = CONFIG["server"].get("public_cache_seconds", 3600)
        cache_control = f"public, max-age={seconds}"
    else:
        seconds = CONFIG["server"].get("browser_cache_seconds", 86400)
        cache_control = f"private, max-age={seconds}"
    return FileResponse(
        path,
        media_type=content_type,
        headers={
            "Cache-Control": cache_control,
            "Content-Security-Policy": CSP,
            "X-Cache": cache_status,
        },
    )


async def update_index(route: str, payload: dict) -> bool:
    """Tells PocketBase about a change this gateway just made, so tags,
    descriptions and sharing follow a moved file and the admin page sees an
    upload without waiting for the next indexer run. A failure here never
    fails the file operation itself (that already happened); the indexer
    reconciles on its next run, though a move it has to discover on its own
    looks like a delete plus a new file, losing that file's tags."""
    try:
        await asyncio.to_thread(
            service.request, "POST", f"/api/custom/cdn/index/{route}", json=payload
        )
        return True
    except httpx.HTTPError as e:
        print(f"[cdn] index {route} failed for {payload}: {e}")
        return False


async def index_file(rel: str, owner: str, visibility: str) -> Optional[str]:
    """Upserts one file's row and returns its cdn_files id (None if
    PocketBase couldn't be reached -- the indexer will add the row later,
    but without an owner, so only admins can see it until then). owner and
    visibility only apply if the row is new; an overwrite keeps the existing
    row's permissions."""
    abs_path = abs_for(rel)
    st = await asyncio.to_thread(os.stat, abs_path)
    row = await asyncio.to_thread(describe, CONFIG["library"]["root"], rel, st)
    row.update(owner=owner, visibility=visibility)
    try:
        result = await asyncio.to_thread(
            service.request,
            "POST",
            "/api/custom/cdn/index/upsert",
            json={"files": [row]},
        )
        return result["ids"].get(rel)
    except httpx.HTTPError as e:
        print(f"[cdn] index upsert failed for {rel}: {e}")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cache, auth, service, public_rules, thumb_slots
    cache = Cache(CONFIG)
    auth = Authorizer(CONFIG)
    service = ServiceClient(CONFIG["auth"])
    public_rules = PublicRules(
        service, CONFIG["auth"].get("public_refresh_seconds", 30)
    )
    public_rules.start()
    thumb_slots = asyncio.Semaphore(CONFIG["thumbnails"].get("max_parallel", 2))
    yield
    await public_rules.stop()
    await auth.stop()
    cache.db.close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "PUT", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "library_mounted": await library_mounted(),
        "cache": cache.stats(),
    }


@app.api_route("/files/{rel_path:path}", methods=["GET", "HEAD"])
async def get_file(rel_path: str, request: Request, w: Optional[int] = None):
    rel = clean_rel(rel_path)
    public = public_rules.covers(rel) and public_rules.covers(real_rel(rel))
    if not public:
        token = Authorizer.token_from(request)
        if not token:
            raise HTTPException(401, "Sign in to view this file")
        session = await auth.session(token)
        if not session:
            raise HTTPException(401, "Sign in to view this file")
        if not session["admin"]:
            # Per-file permission, from the file's cdn_files row. A symlink
            # never gets a non-admin anywhere the row doesn't cover.
            if real_rel(rel) != rel or not await auth.allowed(token, "read", rel):
                raise HTTPException(403, "You don't have access to this file")

    widths = CONFIG["thumbnails"]["widths"]
    if w is not None and w not in widths:
        # A fixed set of sizes, so arbitrary ?w= values can't fill the
        # cache with near-duplicates.
        raise HTTPException(400, f"w must be one of {widths}")

    abs_path = abs_for(rel)
    key = Cache.key_for(rel, "orig" if w is None else f"w{w}")

    def respond(path: str, content_type: str, status: str) -> FileResponse:
        return file_response(path, content_type, status, public)

    async with cache.locked(key):
        entry = cache.get(key)
        if entry and time.time() - entry["validated_at"] < cache.revalidate:
            cache.touch(key)
            return respond(cache.path_for(key), entry["content_type"], "HIT")

        try:
            src = await stat_source(abs_path)
            unreachable = None
        except FileNotFoundError as e:
            if await library_mounted():
                cache.drop(key)
                raise HTTPException(404, "Not found")
            unreachable = e
        except (OSError, asyncio.TimeoutError) as e:
            unreachable = e
        if unreachable is not None:
            if entry:
                cache.touch(key)
                return respond(cache.path_for(key), entry["content_type"], "STALE")
            print(f"[cdn] library unreachable for {rel}: {unreachable!r}")
            raise HTTPException(503, "Library unreachable")

        if not os.path.isfile(abs_path):
            raise HTTPException(404, "Not found")

        if (
            entry
            and entry["src_size"] == src.st_size
            and entry["src_mtime"] == src.st_mtime
        ):
            cache.touch(key, validated=True)
            return respond(cache.path_for(key), entry["content_type"], "HIT")

        max_file_bytes = CONFIG["cache"].get("max_file_mb", 200) * 1024**2
        if w is None and src.st_size > max_file_bytes:
            # Too big to be worth caching (long videos, disk images):
            # stream straight off the NAS. Range requests still work, so
            # video seeking does too.
            return respond(abs_path, guess_mime(abs_path), "BYPASS")

        try:
            content_type = await fill(key, rel, abs_path, src, w)
        except ThumbnailError as e:
            print(f"[cdn] no thumbnail for {rel}: {e}")
            raise HTTPException(415, "No thumbnail available for this file")
        except OSError as e:
            if entry:
                return respond(cache.path_for(key), entry["content_type"], "STALE")
            print(f"[cdn] fill failed for {rel}: {e!r}")
            raise HTTPException(503, "Library unreachable")

    return respond(cache.path_for(key), content_type, "MISS")


# --- Writes -----------------------------------------------------------------
#
# Every write route takes the session only as an Authorization header, never
# the cookie, so no other site can drive them through a signed-in browser
# (a cross-site form or <img> can send cookies, not headers). Every write
# also refuses to run while the library looks unmounted, since writing into
# an empty mount point would put files on this Mac's own disk instead.
#
#   - admins: the whole library (the CDN tab of ryanzrau.dev/admin)
#   - apps: POST /api/apps/<app>/files uploads into apps/<app>/ for anyone
#     granted that app; the uploader owns the file
#   - owners: DELETE their own files

VISIBILITIES = ("private", "shared", "app", "public")


async def require_session(request: Request) -> tuple[str, dict]:
    token = Authorizer.bearer_from(request)
    session = await auth.session(token) if token else None
    if not session:
        raise HTTPException(401, "Sign in required")
    if not await library_mounted():
        raise HTTPException(503, "Library unreachable")
    return token, session


async def require_admin(request: Request) -> dict:
    _, session = await require_session(request)
    if not session["admin"]:
        raise HTTPException(403, "Admin only")
    return session


def _list_dir(abs_path: str, rel: str) -> dict:
    folders, files = [], []
    with os.scandir(abs_path) as it:
        for entry in it:
            if is_ignored(entry.name):
                continue
            child = f"{rel}/{entry.name}" if rel else entry.name
            try:
                if entry.is_dir():
                    folders.append({"name": entry.name, "path": child})
                elif entry.is_file():
                    st = entry.stat()
                    mime = guess_mime(entry.name)
                    files.append(
                        {
                            "name": entry.name,
                            "path": child,
                            "size": st.st_size,
                            "mtime": st.st_mtime,
                            "mime": mime,
                            "kind": kind_for(mime),
                        }
                    )
            except OSError:
                continue
    folders.sort(key=lambda f: f["name"].lower())
    files.sort(key=lambda f: f["name"].lower())
    return {"path": rel, "folders": folders, "files": files}


async def receive_file(request: Request, dest: str) -> int:
    """Streams the raw request body (no multipart) to a hidden temp file
    beside `dest`, then renames it into place, so a half-finished upload is
    never visible or indexed. Returns the byte count."""
    max_bytes = CONFIG.get("uploads", {}).get("max_mb", 4096) * 1024**2
    declared = int(request.headers.get("content-length") or 0)
    if declared > max_bytes:
        raise HTTPException(413, "File too large")

    tmp = os.path.join(os.path.dirname(dest), f".upload-{time.monotonic_ns()}.tmp")
    written = 0
    try:
        f = await asyncio.to_thread(open, tmp, "wb")
        try:
            async for chunk in request.stream():
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(413, "File too large")
                await asyncio.to_thread(f.write, chunk)
        finally:
            await asyncio.to_thread(f.close)
        await asyncio.to_thread(os.replace, tmp, dest)
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)
    return written


def safe_filename(name: str) -> str:
    """An uploaded file's name, made safe to use as one path segment:
    no directories, no leading dot, no control or path characters,
    at most 100 characters (keeping the extension)."""
    name = name.replace("\\", "/").rsplit("/", 1)[-1]
    name = re.sub(r"[\x00-\x1f/:*?\"<>|#%]+", "-", name).strip(" .-")
    stem, dot, ext = name.rpartition(".")
    if not dot:
        stem, ext = name, ""
    stem = stem[: 100 - len(ext) - 1] if ext else stem[:100]
    name = f"{stem}.{ext}" if ext and stem else (stem or "file")
    return name if not is_ignored(name) else f"file-{name.lstrip('.')}"


@app.get("/api/list")
async def list_folder(path: str = "", _: dict = Depends(require_admin)):
    rel = clean_rel(path, allow_root=True)
    abs_path = abs_for(rel)
    if not os.path.isdir(abs_path):
        raise HTTPException(404, "Not a folder")
    return await asyncio.to_thread(_list_dir, abs_path, rel)


@app.put("/api/files/{rel_path:path}")
async def upload(
    rel_path: str,
    request: Request,
    overwrite: bool = False,
    visibility: str = "private",
    session: dict = Depends(require_admin),
):
    """Admin upload to any path in the library (the admin page)."""
    if visibility not in VISIBILITIES:
        raise HTTPException(400, f"visibility must be one of {VISIBILITIES}")
    rel = clean_rel(rel_path, status=400)
    dest = abs_for(rel, status=400)
    if not os.path.isdir(os.path.dirname(dest)):
        raise HTTPException(404, "Folder doesn't exist")
    if os.path.isdir(dest):
        raise HTTPException(409, "A folder with that name exists")
    if os.path.lexists(dest) and not overwrite:
        raise HTTPException(409, "A file with that name exists")

    written = await receive_file(request, dest)
    cache.drop_path(rel)
    record_id = await index_file(rel, session["user_id"], visibility)
    return {"id": record_id, "path": rel, "size": written, "indexed": bool(record_id)}


@app.post("/api/apps/{app_slug}/files")
async def app_upload(
    app_slug: str, request: Request, name: str = "file", visibility: str = "private"
):
    """Upload from an app. The body is the raw file; `name` its original
    filename. Stored at apps/<app>/<yyyy>/<mm>/<random>-<name>, so apps
    never pick paths or collide, owned by the uploader, with the given
    visibility (changeable later on the cdn_files row). Allowed for anyone
    granted the app. Returns the new cdn_files record's id and path --
    store the id in the app's own collection."""
    if not APP_SLUG_RE.fullmatch(app_slug):
        raise HTTPException(400, "Bad app")
    if visibility not in VISIBILITIES:
        raise HTTPException(400, f"visibility must be one of {VISIBILITIES}")
    token, session = await require_session(request)
    if not await auth.allowed(token, "upload", app_slug):
        raise HTTPException(403, "You don't have access to this app")

    filename = f"{os.urandom(4).hex()}-{safe_filename(name)}"
    rel = "/".join(
        ["apps", app_slug, time.strftime("%Y"), time.strftime("%m"), filename]
    )
    dest = abs_for(rel, status=400)
    await asyncio.to_thread(os.makedirs, os.path.dirname(dest), exist_ok=True)
    written = await receive_file(request, dest)
    record_id = await index_file(rel, session["user_id"], visibility)
    if not record_id:
        # Without a row nobody but an admin could ever see or delete it --
        # don't leave an orphan the uploader thinks failed anyway.
        await asyncio.to_thread(os.remove, dest)
        raise HTTPException(503, "Couldn't record the file; try again")
    return {"id": record_id, "path": rel, "size": written}


@app.post("/api/mkdir")
async def mkdir(path: str = Body(embed=True), _: dict = Depends(require_admin)):
    rel = clean_rel(path, status=400)
    try:
        await asyncio.to_thread(os.mkdir, abs_for(rel, status=400))
    except FileExistsError:
        raise HTTPException(409, "Something with that name already exists")
    except FileNotFoundError:
        raise HTTPException(404, "Parent folder doesn't exist")
    return {"path": rel}


@app.post("/api/move")
async def move(
    source: str = Body(alias="from", embed=True),
    to: str = Body(embed=True),
    _: dict = Depends(require_admin),
):
    """Rename or move a file or folder. Never overwrites."""
    src_rel = clean_rel(source, status=400)
    dest_rel = clean_rel(to, status=400)
    if dest_rel == src_rel or dest_rel.startswith(src_rel + "/"):
        raise HTTPException(400, "Can't move something into itself")
    src_abs, dest_abs = literal_for(src_rel), literal_for(dest_rel)
    if not os.path.lexists(src_abs):
        raise HTTPException(404, "Not found")
    if os.path.lexists(dest_abs):
        raise HTTPException(409, "Something with that name already exists")
    if not os.path.isdir(os.path.dirname(dest_abs)):
        raise HTTPException(404, "Destination folder doesn't exist")

    await asyncio.to_thread(os.rename, src_abs, dest_abs)
    cache.drop_path(src_rel)
    cache.drop_path(dest_rel)
    indexed = await update_index("move", {"from": src_rel, "to": dest_rel})
    return {"path": dest_rel, "indexed": indexed}


@app.delete("/api/files/{rel_path:path}")
async def delete(rel_path: str, request: Request):
    """Moves a file or folder into .trash/<timestamp>/ under the library
    root rather than deleting it -- empty that by hand on the NAS. Admins
    can delete anything; anyone else only a file they own."""
    token, session = await require_session(request)
    rel = clean_rel(rel_path, status=400)
    if not session["admin"] and not await auth.allowed(token, "manage", rel):
        raise HTTPException(403, "You can only delete your own files")
    src_abs = literal_for(rel)
    if not os.path.lexists(src_abs):
        raise HTTPException(404, "Not found")
    if not session["admin"] and not os.path.isfile(src_abs):
        raise HTTPException(403, "You can only delete your own files")
    stamp = time.strftime("%Y%m%d-%H%M%S") + f"-{time.monotonic_ns() % 1_000_000}"
    trash_abs = os.path.join(CONFIG["library"]["root"], TRASH_DIR, stamp, rel)

    def to_trash():
        os.makedirs(os.path.dirname(trash_abs), exist_ok=True)
        os.rename(src_abs, trash_abs)

    await asyncio.to_thread(to_trash)
    cache.drop_path(rel)
    return {"trashed": rel, "indexed": await update_index("remove", {"path": rel})}


def main():
    global CONFIG
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()
    CONFIG = load_config(args.config)
    uvicorn.run(app, host=CONFIG["server"]["host"], port=CONFIG["server"]["port"])


if __name__ == "__main__":
    main()
