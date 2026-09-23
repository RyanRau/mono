"""Shared by gateway.py and indexer.py: what counts as a library file, what
kind of file it is, how its metadata is read, and the PocketBase
service-account client -- so the two never disagree about any of it."""

import mimetypes
import os
import re
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from PIL import Image

try:
    # HEIC/HEIF (iPhone photos) -- optional, but without it HEIC files get
    # no metadata and no thumbnails.
    from pillow_heif import register_heif_opener

    register_heif_opener()
except ImportError:
    pass

# Formats Python's mimetypes table doesn't know on every platform.
for _mime, _ext in (
    ("image/heic", ".heic"),
    ("image/heif", ".heif"),
    ("image/avif", ".avif"),
    ("image/webp", ".webp"),
    ("image/x-adobe-dng", ".dng"),
    ("video/quicktime", ".mov"),
    ("video/x-matroska", ".mkv"),
    ("video/mp4", ".m4v"),
):
    mimetypes.add_type(_mime, _ext)

# Files and directories NASes and operating systems scatter around that are
# never library content (Synology's @eaDir thumbnails, recycle bins, macOS
# metadata). Dotfiles are skipped too, see is_ignored().
IGNORED_NAMES = {
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    "@eaDir",
    "#recycle",
    "#snapshot",
}

DOCUMENT_MIMES = {
    "application/pdf",
    "application/msword",
    "application/rtf",
    "text/plain",
    "text/markdown",
    "text/csv",
}


# registry_apps slugs, as cdn_files.app stores them.
APP_SLUG_RE = re.compile(r"[a-z0-9][a-z0-9_-]{0,59}")


def is_ignored(name: str) -> bool:
    return name in IGNORED_NAMES or name.startswith(".")


def guess_mime(path: str) -> str:
    return mimetypes.guess_type(path)[0] or "application/octet-stream"


def kind_for(mime: str) -> str:
    """One of cdn_files.kind's select values."""
    major = mime.split("/", 1)[0]
    if major in ("image", "video", "audio"):
        return major
    if mime in DOCUMENT_MIMES or mime.startswith("application/vnd.openxmlformats"):
        return "document"
    return "other"


# EXIF tag ids (Pillow exposes them numerically).
EXIF_IFD = 0x8769
GPS_IFD = 0x8825
TAG_MAKE = 0x010F
TAG_MODEL = 0x0110
TAG_ORIENTATION = 0x0112
TAG_DATETIME = 0x0132
TAG_DATETIME_ORIGINAL = 0x9003
TAG_OFFSET_TIME_ORIGINAL = 0x9011


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
        print(f"[metadata] none for {abs_path}: {e}")
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


def app_for(rel: str) -> str:
    """The app a library path belongs to: apps/<slug>/... is that app's
    storage, anything else is the admin's own library ("")."""
    parts = rel.split("/")
    if len(parts) >= 3 and parts[0] == "apps" and APP_SLUG_RE.fullmatch(parts[1]):
        return parts[1]
    return ""


def describe(root: str, rel: str, st: os.stat_result) -> dict:
    """A cdn_files upsert row for one file. `app` only takes effect when the
    row is first created (see index/upsert in pb_hooks/cdn.pb.js)."""
    abs_path = os.path.join(root, rel)
    mime = guess_mime(abs_path)
    row = {
        "path": rel,
        "name": os.path.basename(rel),
        "kind": kind_for(mime),
        "mime": mime,
        "size": st.st_size,
        "mtime": st.st_mtime,
        "app": app_for(rel),
    }
    if row["kind"] == "image":
        row.update(image_metadata(abs_path))
    return row


class ServiceClient:
    """PocketBase client for the service account (indexer.py, and gateway.py
    for index updates after its own file operations and for public-sharing
    rules) -- same auth flow as llm-gateway's KeyStore. Synchronous; the
    gateway calls it via asyncio.to_thread. The lock keeps concurrent
    threads from re-authenticating over each other."""

    def __init__(self, auth_cfg: dict):
        self.email = auth_cfg["service_email"]
        self.password = auth_cfg["service_password"]
        self.client = httpx.Client(
            base_url=auth_cfg["pocketbase_url"].rstrip("/"), timeout=60
        )
        self.token: Optional[str] = None
        self._lock = threading.Lock()

    def _authenticate(self):
        r = self.client.post(
            "/api/collections/users/auth-with-password",
            json={"identity": self.email, "password": self.password},
        )
        r.raise_for_status()
        self.token = r.json()["token"]

    def request(self, method: str, path: str, **kwargs) -> dict:
        with self._lock:
            if not self.token:
                self._authenticate()
        r = self.client.request(
            method, path, headers={"Authorization": f"Bearer {self.token}"}, **kwargs
        )
        if r.status_code == 401:
            with self._lock:
                self._authenticate()
            r = self.client.request(
                method,
                path,
                headers={"Authorization": f"Bearer {self.token}"},
                **kwargs,
            )
        r.raise_for_status()
        return r.json()
