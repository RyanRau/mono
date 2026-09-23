"""Walks the NAS library and syncs one cdn_files row per file into
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

import yaml

from library import ServiceClient, describe, is_ignored

BATCH = 200


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
    pb = ServiceClient(cfg["auth"])

    started = time.time()
    known = {
        f["path"]: (f["size"], f["mtime"])
        for f in pb.request("GET", "/api/custom/cdn/index/state")["files"]
    }
    print(f"[indexer] {len(known)} files already indexed; scanning {root}")

    present: list[str] = []
    pending: list[dict] = []
    totals = {"created": 0, "updated": 0}

    def flush():
        if pending and not args.dry_run:
            result = pb.request(
                "POST", "/api/custom/cdn/index/upsert", json={"files": pending}
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
            "POST", "/api/custom/cdn/index/sweep", json={"present": present}
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
