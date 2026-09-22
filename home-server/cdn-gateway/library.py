"""What counts as a library file, and what kind of file it is -- shared by
gateway.py (what it will serve) and indexer.py (what it will index), so the
two never disagree about either."""

import mimetypes

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


def is_ignored(name: str) -> bool:
    return name in IGNORED_NAMES or name.startswith(".")


def guess_mime(path: str) -> str:
    return mimetypes.guess_type(path)[0] or "application/octet-stream"


def kind_for(mime: str) -> str:
    """One of media_files.kind's select values."""
    major = mime.split("/", 1)[0]
    if major in ("image", "video", "audio"):
        return major
    if mime in DOCUMENT_MIMES or mime.startswith("application/vnd.openxmlformats"):
        return "document"
    return "other"
