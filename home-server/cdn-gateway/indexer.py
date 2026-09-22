"""Walks the NAS library and syncs one media_files row per file into
PocketBase: new and changed files get their metadata (type, size, EXIF date,
GPS location, camera, dimensions) read and upserted; files that are gone
get flagged `missing`. Tags and descriptions are never touched.

Run: python3 indexer.py --config config.yaml [--dry-run] [--limit N]
Meant to run on a schedule (see README.md#indexer) -- it's incremental, so
a run over an unchanged library is just a directory walk.
"""

import argparse
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import yaml
from PIL import Image

from library import guess_mime, is_ignored, kind_for

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

BATCH = 200

# EXIF tag ids (Pillow exposes them numerically).
EXIF_IFD = 0x8769
GPS_IFD = 0x8825
TAG_MAKE = 0x010F
TAG_MODEL = 0x0110
TAG_ORIENTATION = 0x0112
TAG_DATETIME = 0x0132
TAG_DATETIME_ORIGINAL = 0x9003
TAG_OFFSET_TIME_ORIGINAL = 0x9011


class PocketBase:
    """Service-account client -- same auth flow as llm-gateway's KeyStore."""

    def __init__(self, auth_cfg: dict):
        self.email = auth_cfg["service_email"]
        self.password = auth_cfg["service_password"]
        self.client = httpx.Client(
            base_url=auth_cfg["pocketbase_url"].rstrip("/"), timeout=60
        )
        self.token: Optional[str] = None

    def _authenticate(self):
        r = self.client.post(
            "/api/collections/users/auth-with-password",
            json={"identity": self.email, "password": self.password},
        )
        r.raise_for_status()
        self.token = r.json()["token"]

    def request(self, method: str, path: str, **kwargs) -> dict:
        if not self.token:
            self._authenticate()
        r = self.client.request(
            method, path, headers={"Authorization": f"Bearer {self.token}"}, **kwargs
        )
        if r.status_code == 401:
            self._authenticate()
            r = self.client.request(
                method,
                path,
                headers={"Authorization": f"Bearer {self.token}"},
                **kwargs,
            )
        r.raise_for_status()
        return r.json()


def walk(root: str, errors: list):
    """Yields (relative path, stat) for every library file under root, with
    the same ignore rules the gateway applies when serving. Directories that
    can't be listed are appended to `errors` -- their files would otherwise
    just silently look deleted."""
    for dirpath, dirnames, filenames in os.walk(root, onerror=errors.append):
        dirnames[:] = sorted(d for d in dirnames if not is_ignored(d))
        for name in sorted(filenames):
            if is_ignored(name):
                continue
            abs_path = os.path.join(dirpath, name)
            # A symlink out of the library is something the gateway will
            # never serve (see resolve_library_path), so don't index it.
            real = os.path.realpath(abs_path)
            if os.path.commonpath([root, real]) != root:
                continue
            try:
                st = os.stat(abs_path)
            except OSError as e:
                print(f"[indexer] skipping unreadable {abs_path}: {e}")
                continue
            rel = os.path.relpath(abs_path, root).replace(os.sep, "/")
            yield rel, st


def _gps_to_degrees(values, ref) -> Optional[float]:
    try:
        d, m, s = (float(v) for v in values)
    except (TypeError, ValueError, ZeroDivisionError):
        return None
    deg = d + m / 60 + s / 3600
    return -deg if ref in ("S", "W") else deg


def _parse_exif_time(value, offset) -> Optional[str]:
    """EXIF dates are local wall-clock time with an optional separate UTC
    offset tag (newer cameras and phones). Without one, the wall-clock time
    is stored as if it were UTC -- close enough for sorting and browsing,
    and never shifted by whatever timezone this machine happens to be in."""
    if not value:
        return None
    try:
        dt = datetime.strptime(str(value).strip("\x00 "), "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    if offset:
        try:
            sign = -1 if str(offset).startswith("-") else 1
            hh, mm = str(offset).strip("+-\x00 ").split(":")
            dt -= sign * timedelta(hours=int(hh), minutes=int(mm))
        except ValueError:
            pass
    return dt.replace(tzinfo=timezone.utc).strftime("%Y-%m-%d %H:%M:%S.000Z")


def image_metadata(abs_path: str) -> dict:
    """Header-only read (Pillow doesn't decode pixel data for this), so it's
    cheap even over the NAS mount. Returns explicit None for anything the
    file lacks, so a re-export that stripped GPS clears the old location."""
    meta = {
        "taken_at": None,
        "width": None,
        "height": None,
        "location": None,
        "camera": None,
    }
    try:
        with Image.open(abs_path) as img:
            width, height = img.size
            exif = img.getexif()
    except Exception as e:
        print(f"[indexer] no image metadata for {abs_path}: {e}")
        return meta

    if exif.get(TAG_ORIENTATION) in (5, 6, 7, 8):
        width, height = height, width  # stored rotated; report as displayed
    meta["width"], meta["height"] = width, height

    sub = exif.get_ifd(EXIF_IFD)
    meta["taken_at"] = _parse_exif_time(
        sub.get(TAG_DATETIME_ORIGINAL) or exif.get(TAG_DATETIME),
        sub.get(TAG_OFFSET_TIME_ORIGINAL),
    )

    make = str(exif.get(TAG_MAKE) or "").strip("\x00 ")
    model = str(exif.get(TAG_MODEL) or "").strip("\x00 ")
    # Most models already start with the make ("Canon EOS R6"); don't
    # double it up.
    camera = model if model.lower().startswith(make.lower()) else f"{make} {model}"
    meta["camera"] = camera.strip() or None

    gps = exif.get_ifd(GPS_IFD)
    if gps.get(2) and gps.get(4):
        lat = _gps_to_degrees(gps[2], gps.get(1))
        lon = _gps_to_degrees(gps[4], gps.get(3))
        if lat is not None and lon is not None and (lat, lon) != (0, 0):
            meta["location"] = {"lat": round(lat, 6), "lon": round(lon, 6)}
    return meta


def describe(root: str, rel: str, st: os.stat_result) -> dict:
    abs_path = os.path.join(root, rel)
    mime = guess_mime(abs_path)
    row = {
        "path": rel,
        "name": os.path.basename(rel),
        "kind": kind_for(mime),
        "mime": mime,
        "size": st.st_size,
        "mtime": st.st_mtime,
    }
    if row["kind"] == "image":
        row.update(image_metadata(abs_path))
    return row


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument(
        "--dry-run", action="store_true", help="scan and report, write nothing"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="index at most N new/changed files this run (0 = all); "
        "skips the missing-file sweep, since the scan is partial",
    )
    args = parser.parse_args()

    with open(args.config) as f:
        cfg = yaml.safe_load(f)
    root = os.path.realpath(os.path.expanduser(cfg["library"]["root"]))
    pb = PocketBase(cfg["auth"])

    started = time.time()
    known = {
        f["path"]: (f["size"], f["mtime"])
        for f in pb.request("GET", "/api/custom/media/index/state")["files"]
    }
    print(f"[indexer] {len(known)} files already indexed; scanning {root}")

    present: list[str] = []
    pending: list[dict] = []
    totals = {"created": 0, "updated": 0}

    def flush():
        if pending and not args.dry_run:
            result = pb.request(
                "POST", "/api/custom/media/index/upsert", json={"files": pending}
            )
            totals["created"] += result["created"]
            totals["updated"] += result["updated"]
        pending.clear()

    changed = 0
    limited = False
    walk_errors: list[OSError] = []
    for rel, st in walk(root, walk_errors):
        present.append(rel)
        # mtime compared at millisecond precision: it round-trips through a
        # JSON float and PocketBase's number field.
        prior = known.get(rel)
        if prior and prior[0] == st.st_size and abs(prior[1] - st.st_mtime) < 1e-3:
            continue
        if args.limit and changed >= args.limit:
            limited = True
            continue
        changed += 1
        pending.append(describe(root, rel, st))
        if args.dry_run:
            print(f"[indexer] would index {rel}")
        if len(pending) >= BATCH:
            flush()
    flush()

    if not present:
        # An unmounted NAS share is just an empty directory. Sweeping now
        # would flag the entire library missing -- recoverable, but never
        # what anyone wants. A genuinely empty library has nothing to flag.
        print(f"[indexer] {root} is empty -- is the NAS mounted? Skipping sweep.")
        sys.exit(1 if known else 0)

    swept = {}
    if walk_errors:
        for e in walk_errors:
            print(f"[indexer] couldn't list {e.filename}: {e}")
        print("[indexer] scan was incomplete; skipping the missing-file sweep")
    elif limited:
        print("[indexer] --limit reached; skipping the missing-file sweep")
    elif not args.dry_run:
        swept = pb.request(
            "POST", "/api/custom/media/index/sweep", json={"present": present}
        )

    print(
        f"[indexer] done in {time.time() - started:.1f}s: {len(present)} files, "
        f"{changed} new/changed ({totals['created']} created, "
        f"{totals['updated']} updated), "
        f"{swept.get('flagged_missing', 0)} flagged missing, "
        f"{swept.get('restored', 0)} restored"
    )


if __name__ == "__main__":
    main()
