# CDN Gateway: the shared file store

The file store for every app, served at `https://cdn.ryanzrau.dev`. Files
live on a NAS at home. PocketBase records each file's owner and who may
see it. This gateway, on the home Mac, serves the files with a local disk
cache (so repeat views don't touch the NAS) and on-the-fly WebP
thumbnails.

- **Apps** upload through `src/cdn.ts` in the app template and keep a
  relation to the file's `cdn_files` row.
- **Each file's visibility** is `private` (the uploader), `shared` (plus
  chosen users), `app` (everyone granted its app) or `public` (anyone).
- **Admins** see and manage everything from the **CDN tab of
  `ryanzrau.dev/admin`**, including your own photo library outside any app.
- **An indexer** picks up files that land on the NAS some other way (SMB,
  phone backup) and reads photo EXIF for search.

```
 browser ──▶ cdn.ryanzrau.dev ──▶ Traefik (droplet) ──WireGuard──▶ gateway.py :8001 (home Mac)
   <img src=".../files/apps/stash/…/lamp.jpg?w=512">   │ public path? serve. Otherwise the
                                                       │ pb_auth cookie / Bearer token
                                                       │   → POST /api/custom/cdn/authorize
                                                       │     (PocketBase: this user, this file; cached)
                                            ┌──────────▼──────────┐
                                            │ local SSD cache     │ HIT → serve
                                            │ (LRU, SQLite index) │
                                            └──────────┬──────────┘
                                                       │ MISS → copy / render thumbnail
                                            ┌──────────▼──────────┐
                                            │ NAS share (mounted) │◀── indexer.py (scheduled)
                                            │ apps/<slug>/…       │
                                            │ photos/…  (yours)   │
                                            └─────────────────────┘
```

## How the pieces split

| Piece                                | Owns                                                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `gateway.py`                         | Serving `/files/<path>` (permission check, cache, thumbnails), app uploads, and the admin file routes.      |
| `indexer.py`                         | Keeping `cdn_files` in step with files that change on the NAS directly: new/changed files, EXIF, missing.   |
| PocketBase `cdn_files` / `cdn_tags`  | One row per file: path, app, owner, visibility, sharing, tags, description, EXIF.                           |
| PocketBase `cdn_public`              | Named public collections (`homepage`) of files or whole folders, for pages to list.                         |
| `apps/pocketbase/pb_hooks/cdn.pb.js` | The permission check (`authorize`) and the service-only index routes.                                       |
| App template `src/cdn.ts`            | The client every app uses: `uploadFile`, `fileUrl`, `deleteFile`, `setAccess`.                              |
| `apps/ryanzrau` → `/admin` → CDN     | The admin UI: folder browser, file operations, visibility, sharing, tags, descriptions, public collections. |

On the NAS, `apps/<slug>/<yyyy>/<mm>/<random>-<name>` is each app's
storage (the gateway picks the path, so apps never collide). Everything
else, like `photos/`, is your own library.

## Install

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp config.example.yaml config.yaml
```

`pillow-heif` is there for iPhone HEIC photos; without it everything else
still works but HEIC thumbnails return 415.

## Mount the NAS

Mount the share on this machine and point `library.root` at the mounted
directory. Mount it read-write: apps upload into it. With a read-only mount, viewing
still works and every upload, move and delete fails. On
macOS, for example, Finder → Go → Connect to Server
(`smb://nas.local/media`), then add it to Login Items so it remounts after
a reboot. It appears under `/Volumes/<share>`.

Everything under `library.root` can be served. Dotfiles, `.DS_Store`,
`@eaDir` (Synology thumbnails), `#recycle`/`#snapshot` and symlinks that
point outside the root are skipped by both the gateway and the indexer. If
there's anything on the share you don't want reachable, point `root` at a
subdirectory.

## Who can do what

Reading a file (`GET /files/<path>`):

| Who                               | Can read                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Anyone, signed in or not          | Files with visibility `public`, and anything in a `cdn_public` collection             |
| The file's owner                  | Their own files                                                                       |
| Users in the file's `shared_with` | Files with visibility `shared`                                                        |
| Users granted the file's app      | Files with visibility `app` (`registry_grants`, the same grants apps already gate on) |
| Admins (`is_admin`)               | Everything                                                                            |

Writing:

| Route                                                                           | Who                                        |
| ------------------------------------------------------------------------------- | ------------------------------------------ |
| `POST /api/apps/<slug>/files`                                                   | Anyone granted that app; they own the file |
| `DELETE /api/files/<path>`                                                      | The file's owner, or an admin              |
| Everything else under `/api/`                                                   | Admins                                     |
| Visibility, sharing, tags, description (on the `cdn_files` row, via PocketBase) | The owner, or an admin                     |

**How reads are checked.** A signed-out visitor only ever gets public
paths. The gateway keeps a local copy of them, re-pulled every
`public_refresh_seconds` (30), so anonymous traffic never reaches
PocketBase. A signed-in viewer's token comes from the `pb_auth` cookie every
`*.ryanzrau.dev` app already sets, so a plain `<img>` works, or from an
`Authorization: Bearer` header. The gateway forwards that token to
PocketBase's `POST /api/custom/cdn/authorize`, which answers as that user.
It evaluates `cdn_files`' own `viewRule` against the file's row, so the
gateway and the PocketBase API can never disagree about who sees what.

- Admins are recognized once per session and skip per-file checks.
- Everyone else gets one check per distinct file, cached for
  `session_cache_seconds` (denials for 5s). A grid of 200 thumbnails costs
  200 small checks on first view, then none until they expire, and
  simultaneous identical checks share one request.
- So a permission change reaches signed-in viewers within
  `session_cache_seconds`, and signed-out ones within
  `public_refresh_seconds`.
- A file with no row yet (just dropped on the NAS, not indexed) is
  admins-only. A symlink never extends a non-admin's access past what the
  row covers.
- Fails closed. If PocketBase can't be reached, nothing new is allowed;
  answers already cached keep working until they expire.

**Writes take the header only.** The write routes ignore the cookie, so
another site can't make a signed-in browser upload or delete anything:
a cross-site form or `<img>` can send cookies but not an `Authorization`
header. They also refuse to run while the NAS looks unmounted, so an
upload can't land on the Mac's own disk under an empty mount point.

**The service account.** Both `gateway.py` and `indexer.py` log in as a
PocketBase service account. They use it to write the index and, for the
gateway, to pull the public paths. It is never used to decide what a
viewer may do. Set it up once per fresh `pb_data` volume:

1. In the PocketBase admin UI, create a `users` record (e.g.
   `cdn-indexer@service.internal`) with `is_service` checked.
2. Put its email and password in `config.yaml` under
   `auth.service_email`/`service_password`.

`is_service` is one flag shared by every service account, so this account
can also call the llm-gateway's service routes. Keep `config.yaml` as
private as llm-gateway's.

## Using it from an app

New apps get `src/cdn.ts` from the template (`infra/templates/app`); its
`CDN_APP` must match the app's `registry_apps` slug. For an existing app,
copy that file in.

```ts
import { uploadFile, fileUrl, setAccess, deleteFile } from "./cdn";

// Upload, owned by the signed-in user. Store the id as a relation to cdn_files.
const { id, path } = await uploadFile(file, "private");
await pb.collection("stash_items").update(itemId, { photo: id });

// Show it. The login cookie authorizes the <img>.
<img src={fileUrl(path, 512)} />;

// Change who can see it (owner or admin only).
await setAccess(id, "shared", [otherUserId]);
await setAccess(id, "app"); // everyone granted this app
await setAccess(id, "public"); // anyone

// Delete it (to the NAS trash).
await deleteFile(path);
```

Reading rows works like any collection. A user can list exactly the files
they're allowed to see, e.g. with `pb.collection("cdn_files").getList(...)`
or by expanding the relation from the app's own record.

## Public collections

On top of per-file visibility, a `cdn_public` row puts a file, or a whole
folder including files added later, into a named public collection
(lowercase letters, digits and dashes, e.g. `homepage`). Manage these from
the admin page. A page lists a collection from PocketBase with no auth:

```ts
const res = await fetch("https://api.ryanzrau.dev/api/custom/cdn/public/homepage");
const { files } = await res.json(); // [{ path, name, kind, mime, width, height, taken_at, description }]
// <img src={`https://cdn.ryanzrau.dev/files/${encodeURI(f.path)}?w=1024`} />
```

The listing returns at most 500 files, newest `taken_at` first, and only
display fields: never tags, camera or GPS location. Moving a file keeps it
in its collections. Deleting it drops it from them, so a new file later
created at the same path isn't public by accident.

## Run

```bash
python3 gateway.py --config config.yaml
```

Start it the same way as llm-gateway on the same Mac (a launchd agent or
login item). The droplet reaches it at the LAN IP in
`infra/traefik/dynamic/cdn-gateway.yml`, over the WireGuard tunnel, the
same path `llm.ryanzrau.dev` takes, so bind `server.host` to `0.0.0.0` and
make sure the router allows the tunnel through to port 8001.

```bash
curl -H "Authorization: Bearer $PB_TOKEN" \
  "http://127.0.0.1:8001/files/2024/trip/beach.jpg?w=512" -o thumb.webp
```

## Routes

| Route                                           | Who                   | Purpose                                                                                                    |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /health`                                   | anyone                | `library_mounted` and cache size/entries                                                                   |
| `GET` or `HEAD` `/files/<path>`                 | see "Who can do what" | The original file. Range requests work, so video seeking works.                                            |
| `GET` or `HEAD` `/files/<path>?w=<px>`          | see "Who can do what" | A WebP thumbnail, `w` px wide (EXIF rotation applied, never upscaled). `w` must be in `thumbnails.widths`. |
| `POST /api/apps/<slug>/files?name=&visibility=` | granted users         | App upload; the raw body is the file. Returns `{ id, path, size }`.                                        |
| `DELETE /api/files/<path>`                      | owner or admin        | Move to `.trash/<timestamp>/` in the library. Drops it from public collections. Admins can delete folders. |
| `GET /api/list?path=<folder>`                   | admin                 | A folder's direct subfolders and files. Omit `path` for the root.                                          |
| `PUT /api/files/<path>?overwrite=&visibility=`  | admin                 | Upload to any path. 409 if it exists, unless `overwrite=true`.                                             |
| `POST /api/mkdir` `{path}`                      | admin                 | New folder. The parent must exist.                                                                         |
| `POST /api/move` `{from, to}`                   | admin                 | Rename or move. Never overwrites. The row (owner, visibility, tags, sharing) moves with it.                |

Every file response has an `X-Cache` header:

- `HIT`: served from the local cache.
- `MISS`: just copied or rendered into the cache.
- `STALE`: the NAS is unreachable, so a cached copy was served.
- `BYPASS`: the original is over `max_file_mb`, so it streams straight
  from the NAS uncached.

Errors:

- 401: not public and no valid session.
- 403: signed in, but not allowed this file or action.
- 404: no such file. Anything outside the root or hidden also returns 404.
- 415: a thumbnail was requested for something that isn't a renderable
  image.
- 503: the NAS is unreachable and nothing is cached, or a write was
  attempted while it's unmounted.

## Caching

- **Hits don't touch the NAS.** A cached entry younger than
  `revalidate_seconds` is served straight from the SSD. After that, the
  gateway `stat()`s the source (metadata only, no read) and re-fills only
  if the size or mtime changed.
- **NAS down means stale, not broken.** If the share is asleep, unmounted
  or timing out, cached files keep being served (`STALE`). An unmounted
  share looks like an empty directory, so a "file not found" is checked
  against that before the cache drops anything.
- **Bounded.** An LRU capped at `max_gb`. When the cap is exceeded, the
  oldest-accessed entries are evicted down to 90%. The index is SQLite in
  the cache dir, so the cache stays warm across restarts.
- **Browsers cache too.** Non-public files get `Cache-Control: private,
max-age=86400`, public ones `public, max-age=3600`, plus an ETag, so a
  page revisit doesn't cross the WireGuard link at all.
- **Changes through the gateway take effect at once.** An upload, move or
  delete drops the affected cache entries, rather than waiting out
  `revalidate_seconds`.
- **One fill per file.** Simultaneous requests for the same uncached file
  or thumbnail wait for a single NAS read or render.

## Indexer

```bash
python3 indexer.py --config config.yaml --dry-run   # what would change
python3 indexer.py --config config.yaml             # sync
python3 indexer.py --config config.yaml --limit 500 # first run on a big library, in chunks
```

What a run does:

1. Walks the library.
2. For every new or changed file (by size and mtime), reads its metadata:
   `kind` (image/video/audio/document/other), `mime`, `size`, and for
   images `taken_at` (EXIF, offset-aware), `width`/`height` (as displayed,
   after EXIF rotation), `location` (GPS) and `camera`.
3. Upserts those rows into `cdn_files`. A new file under `apps/<slug>/`
   gets `app: <slug>`; any new file the indexer finds (rather than one
   uploaded through the gateway) has no owner and starts `private`, so
   only admins see it until you change that.
4. Flags rows for files that no longer exist as `missing`, and unflags
   them if the files come back.

Unchanged files cost one `stat` each. Rows are never deleted, and owners,
visibility, sharing, tags and descriptions are never touched, so a file that's moved temporarily or a
share that's briefly unmounted loses nothing. The sweep is skipped when:

- the root is empty (probably unmounted; the run exits 1),
- any directory couldn't be listed, or
- `--limit` cut the run short.

Schedule it hourly with launchd. Save this as
`~/Library/LaunchAgents/dev.ryanzrau.cdn-indexer.plist`, then run
`launchctl load` on it:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>dev.ryanzrau.cdn-indexer</string>
  <key>WorkingDirectory</key><string>/Users/you/mono/home-server/cdn-gateway</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/you/mono/home-server/cdn-gateway/venv/bin/python</string>
    <string>indexer.py</string>
    <string>--config</string><string>config.yaml</string>
  </array>
  <key>StartInterval</key><integer>3600</integer>
  <key>StandardOutPath</key><string>/tmp/cdn-indexer.log</string>
  <key>StandardErrorPath</key><string>/tmp/cdn-indexer.log</string>
</dict>
</plist>
```

## Querying the metadata

`cdn_files` is an ordinary PocketBase collection. Each user's queries only
return the files they're allowed to see (its list rule is the same as the
read rules above).

```ts
// Tagged "beach", newest first
pb.collection("cdn_files").getList(1, 50, {
  filter: 'tags.name ?= "beach" && missing = false',
  sort: "-taken_at",
});

// Within 25 km of Portland
pb.collection("cdn_files").getList(1, 50, {
  filter: "geoDistance(location.lon, location.lat, -122.68, 45.52) < 25",
});

// Everything one app stored for me
pb.collection("cdn_files").getList(1, 50, {
  filter: pb.filter("app = {:app} && owner = {:me}", { app: "stash", me: pb.authStore.record?.id }),
});
```

The owner or an admin can edit `visibility`, `shared_with`, `tags`,
`description`, `taken_at`, `location` and `camera`. Only admins can change
`owner` or `app`. Nobody can edit the fields that describe the file on
disk (`path`, `name`, `kind`, `mime`, `size`, `mtime`, `missing`); the
update rule rejects them. Tag names are one shared vocabulary: any
signed-in user can see and add them, and only admins rename or delete them.

## Limitations

- **Everything is served from home.** If the home internet or power is
  down, every app's files are unavailable; the droplet has no copy. Home
  upload speed also caps first loads. For anything that must stay up
  regardless, use a PocketBase file field instead.
- **Delete is a move to `.trash/`**, which nothing empties automatically.
  Clear it on the NAS by hand when you're sure.
- **Moves made outside the gateway lose metadata.** A file renamed over
  SMB looks to the indexer like a deleted file plus a new one, so its
  owner, sharing, tags and description stay behind on the old (now
  `missing`) row, and the new row is admins-only. Move things from the
  admin page to keep them. Admin moves don't change a row's `app`.
- **Uploads are one request per file**, streamed to the NAS, up to
  `uploads.max_mb` each.
- **No video thumbnails** (they would need ffmpeg). Videos serve as
  originals.
- **Public means public.** There are no unguessable or expiring share
  links. A public file is reachable by its plain path, and a browser may
  keep one it has seen for `public_cache_seconds` (1 hour) after it's made
  private again.
- **Unknown location is `{lat: 0, lon: 0}`**, because PocketBase's
  `geoPoint` has no null. Filter on `location.lat != 0` for "has a
  location".
- Every response carries a `sandbox` Content-Security-Policy, so an
  uploaded `.html` or `.svg` can't run script on `cdn.ryanzrau.dev` and
  read the `.ryanzrau.dev` session cookie.
