"""CDN Gateway: authenticated, cached, read-only file server in front of a NAS
directory, with on-the-fly image thumbnails.

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
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image, ImageOps

from library import guess_mime, is_ignored

try:
    # HEIC/HEIF (iPhone photos) -- optional, but without it every HEIC
    # thumbnail request 415s.
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

CONFIG: dict = {}

# pb_auth is the cookie every *.ryanzrau.dev app's CookieAuthStore writes
# (see apps/tony/src/CookieAuthStore.ts) -- scoped to .ryanzrau.dev, so a
# plain <img src="https://cdn.ryanzrau.dev/..."> on any of those apps sends
# the signed-in user's session with no JavaScript involved.
AUTH_COOKIE = "pb_auth"

# Every response gets this. Files come off the NAS as-is, so an .html or
# .svg in the library would otherwise run script on cdn.ryanzrau.dev -- an
# origin that can read the (deliberately non-HttpOnly) pb_auth cookie.
# `sandbox` gives such a document an opaque origin with scripts disabled;
# images and video still render normally.
CSP = "default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'; sandbox"

# Same one-real-caller reasoning as llm-gateway's CORS constant: only our
# own apps (and local dev) ever fetch() from here. <img>/<video> tags don't
# need CORS at all.
CORS_ORIGIN_REGEX = (
    r"https://([a-z0-9-]+\.)*ryanzrau\.dev|http://(localhost|127\.0\.0\.1)(:\d+)?"
)

THUMB_MIME = "image/webp"

# A cache entry (sha256 hex) or an in-progress write of one.
CACHE_FILE_RE = re.compile(r"[0-9a-f]{64}(\.\d+\.\d+\.tmp)?")


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


def resolve_library_path(rel: str) -> tuple[str, str]:
    """Maps a URL path to (normalized relative path, absolute path), or 404s.
    Anything that would land outside the library root -- `..`, an absolute
    path, a symlink pointing elsewhere -- and any hidden/ignored segment is
    treated as not found rather than forbidden, so probing reveals nothing."""
    root = CONFIG["library"]["root"]
    parts = [p for p in rel.split("/") if p]
    if not parts or any(p in (".", "..") or is_ignored(p) for p in parts):
        raise HTTPException(404, "Not found")
    abs_path = os.path.realpath(os.path.join(root, *parts))
    if os.path.commonpath([root, abs_path]) != root:
        raise HTTPException(404, "Not found")
    return "/".join(parts), abs_path


class SessionAuth:
    """Resolves a viewer's PocketBase session token to "may read the
    library", by forwarding it to PocketBase's GET /api/custom/media/access
    (apps/pocketbase/pb_hooks/media.pb.js) -- which authenticates it as that
    user's own session, the same trick as llm-gateway's resolve_session.
    The gateway holds no credentials of its own.

    Results are cached per token (allows for session_cache_seconds, denials
    for a few seconds), and concurrent lookups of the same token share one
    request -- a photo grid fires dozens of thumbnail requests at once with
    the same cookie, and shouldn't fire dozens of PocketBase calls. Fails
    closed: PocketBase unreachable means no new sessions are admitted,
    though already-cached ones keep working until they expire.
    """

    DENY_TTL = 5

    def __init__(self, cfg: dict):
        auth_cfg = cfg["auth"]
        self.allow_ttl = auth_cfg.get("session_cache_seconds", 60)
        self._cache: dict[str, tuple[bool, float]] = {}
        self._inflight: dict[str, asyncio.Future] = {}
        self._client = httpx.AsyncClient(
            base_url=auth_cfg["pocketbase_url"].rstrip("/"), timeout=10
        )

    async def stop(self):
        await self._client.aclose()

    @staticmethod
    def token_from(request: Request) -> Optional[str]:
        header = request.headers.get("authorization", "")
        if header.lower().startswith("bearer "):
            return header[7:].strip() or None
        cookie = request.cookies.get(AUTH_COOKIE)
        if not cookie:
            return None
        try:
            return json.loads(unquote(cookie)).get("token") or None
        except (ValueError, AttributeError):
            return None

    async def allowed(self, token: str) -> bool:
        digest = hashlib.sha256(token.encode()).hexdigest()
        now = time.time()
        cached = self._cache.get(digest)
        if cached and cached[1] > now:
            return cached[0]
        if digest in self._inflight:
            return await asyncio.shield(self._inflight[digest])

        future = asyncio.get_running_loop().create_future()
        self._inflight[digest] = future
        try:
            ok = await self._ask_pocketbase(token)
            ttl = self.allow_ttl if ok else self.DENY_TTL
            if len(self._cache) > 10_000:
                self._cache = {d: e for d, e in self._cache.items() if e[1] > now}
            self._cache[digest] = (ok, now + ttl)
            future.set_result(ok)
            return ok
        except BaseException:
            # Only cancellation gets here (_ask_pocketbase turns every HTTP
            # failure into a denial); waiters see the same cancellation.
            future.cancel()
            raise
        finally:
            del self._inflight[digest]

    async def _ask_pocketbase(self, token: str) -> bool:
        try:
            r = await self._client.get(
                "/api/custom/media/access", headers={"Authorization": f"Bearer {token}"}
            )
        except httpx.HTTPError as e:
            print(f"[cdn] access check failed (network), denying: {e}")
            return False
        return r.status_code == 200


class Cache:
    """Size-bounded LRU of files copied off the NAS (originals) or rendered
    from them (thumbnails), on local disk. The index is a SQLite file in the
    cache dir, so a restart keeps a warm cache.

    Each entry remembers the source file's (size, mtime) at fill time. A hit
    younger than revalidate_seconds is served without touching the NAS at
    all; an older one re-stats the source (a metadata call, not a read) and
    only re-fills if the file actually changed. If the NAS is unreachable,
    a stale entry is still served rather than failing.
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
        self.db.execute(
            """CREATE TABLE IF NOT EXISTS entries (
                key TEXT PRIMARY KEY,
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

    def put(self, key: str, tmp_path: str, src: os.stat_result, content_type: str):
        """Moves an already-written temp file into place and indexes it."""
        size = os.path.getsize(tmp_path)
        dest = self.path_for(key)
        os.replace(tmp_path, dest)
        old = self.db.execute(
            "SELECT bytes FROM entries WHERE key = ?", (key,)
        ).fetchone()
        now = time.time()
        self.db.execute(
            "INSERT OR REPLACE INTO entries VALUES (?, ?, ?, ?, ?, ?, ?)",
            (key, src.st_size, src.st_mtime, size, content_type, now, now),
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
auth: Optional[SessionAuth] = None
thumb_slots: Optional[asyncio.Semaphore] = None


async def stat_source(abs_path: str) -> os.stat_result:
    """os.stat on the NAS mount, off the event loop and time-boxed -- an
    asleep or disconnected SMB/NFS mount can block a stat for a long time."""
    timeout = CONFIG["library"].get("stat_timeout_seconds", 5)
    return await asyncio.wait_for(asyncio.to_thread(os.stat, abs_path), timeout)


async def library_mounted() -> bool:
    """An unmounted share is usually just an empty (or absent) mount point,
    which makes every file in it look deleted. Anything that 404s is
    double-checked against this before the cache forgets it."""
    root = CONFIG["library"]["root"]
    timeout = CONFIG["library"].get("stat_timeout_seconds", 5)
    try:
        listing = await asyncio.wait_for(asyncio.to_thread(os.listdir, root), timeout)
    except (OSError, asyncio.TimeoutError):
        return False
    return bool(listing)


async def fill(
    key: str, abs_path: str, src: os.stat_result, width: Optional[int]
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
        cache.put(key, tmp, src, content_type)
        return content_type
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


def file_response(path: str, content_type: str, cache_status: str) -> FileResponse:
    return FileResponse(
        path,
        media_type=content_type,
        headers={
            "Cache-Control": f"private, max-age={CONFIG['server'].get('browser_cache_seconds', 86400)}",
            "Content-Security-Policy": CSP,
            "X-Cache": cache_status,
        },
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cache, auth, thumb_slots
    cache = Cache(CONFIG)
    auth = SessionAuth(CONFIG)
    thumb_slots = asyncio.Semaphore(CONFIG["thumbnails"].get("max_parallel", 2))
    yield
    await auth.stop()
    cache.db.close()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "HEAD"],
    allow_headers=["Authorization"],
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
    token = SessionAuth.token_from(request)
    if not token or not await auth.allowed(token):
        raise HTTPException(401, "Sign in to view this file")

    widths = CONFIG["thumbnails"]["widths"]
    if w is not None and w not in widths:
        # A fixed set of sizes, so arbitrary ?w= values can't fill the
        # cache with near-duplicates.
        raise HTTPException(400, f"w must be one of {widths}")

    rel, abs_path = resolve_library_path(rel_path)
    key = Cache.key_for(rel, "orig" if w is None else f"w{w}")

    async with cache.locked(key):
        entry = cache.get(key)
        if entry and time.time() - entry["validated_at"] < cache.revalidate:
            cache.touch(key)
            return file_response(cache.path_for(key), entry["content_type"], "HIT")

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
                return file_response(
                    cache.path_for(key), entry["content_type"], "STALE"
                )
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
            return file_response(cache.path_for(key), entry["content_type"], "HIT")

        max_file_bytes = CONFIG["cache"].get("max_file_mb", 200) * 1024**2
        if w is None and src.st_size > max_file_bytes:
            # Too big to be worth caching (long videos, disk images):
            # stream straight off the NAS. Range requests still work, so
            # video seeking does too.
            content_type = guess_mime(abs_path)
            return file_response(abs_path, content_type, "BYPASS")

        try:
            content_type = await fill(key, abs_path, src, w)
        except ThumbnailError as e:
            print(f"[cdn] no thumbnail for {rel}: {e}")
            raise HTTPException(415, "No thumbnail available for this file")
        except OSError as e:
            if entry:
                return file_response(
                    cache.path_for(key), entry["content_type"], "STALE"
                )
            print(f"[cdn] fill failed for {rel}: {e!r}")
            raise HTTPException(503, "Library unreachable")

    return file_response(cache.path_for(key), content_type, "MISS")


def main():
    global CONFIG
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()
    CONFIG = load_config(args.config)
    uvicorn.run(app, host=CONFIG["server"]["host"], port=CONFIG["server"]["port"])


if __name__ == "__main__":
    main()
