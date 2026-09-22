# CDN Gateway

Cached file server in front of a NAS directory, served at
`https://cdn.ryanzrau.dev`. Adds a local disk cache (so repeat views don't
touch the NAS), on-the-fly WebP thumbnails, and a metadata indexer that
syncs every file into PocketBase for tags and search.

Everything is admin-only by default. Chosen files or folders can be made
public in named collections, e.g. photos for the home page. Admins browse
and manage the library from the **CDN tab of `ryanzrau.dev/admin`**: upload,
new folder, rename/move, delete, tags, descriptions and sharing.

```
 browser ──▶ cdn.ryanzrau.dev ──▶ Traefik (droplet) ──WireGuard──▶ gateway.py :8001 (home Mac)
   <img src=".../files/2024/beach.jpg?w=512">          │ pb_auth cookie / Bearer
                                                       │   → GET /api/custom/media/access
                                                       │     (PocketBase, cached 60s)
                                            ┌──────────▼──────────┐
                                            │ local SSD cache     │ HIT → serve
                                            │ (LRU, SQLite index) │
                                            └──────────┬──────────┘
                                                       │ MISS → copy / render thumbnail
                                            ┌──────────▼──────────┐
                                            │ NAS share (mounted) │◀── indexer.py (scheduled)
                                            └─────────────────────┘      walks it, upserts
                                                                         media_files rows
                                                                         → PocketBase
```

## How the pieces split

The gateway does files only. It serves bytes by path and knows nothing
about tags, albums or search. Everything about what a file _is_ lives in
PocketBase:

| Piece                                 | Owns                                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `gateway.py`                          | Serving `/files/<path>` (auth or public check, cache, thumbnails) and the admin file routes. |
| `indexer.py`                          | Keeping `media_files` in step with the NAS: new/changed files, EXIF, missing flags.          |
| PocketBase `media_files`/`media_tags` | Metadata, tags, descriptions, search (by tag, date, location radius, kind, camera).          |
| PocketBase `media_public`             | Which files/folders anyone may view, grouped into named collections.                         |
| `apps/ryanzrau` → `/admin` → CDN      | The admin UI: folder browser, file operations, tags, descriptions, sharing.                  |

The link between them is just the path: a `media_files` row's `path` is the
file's location relative to the library root, and
`https://cdn.ryanzrau.dev/files/<path>` serves it. A page that only shows
files never talks to the gateway except through `<img>`/`<video>` tags,
and the gateway never needs to change when tagging or search features do.

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
directory. Mount it read-write if you want the admin page's upload, move
and delete to work; with a read-only mount, viewing still works and those
operations fail. On
macOS, for example, Finder → Go → Connect to Server
(`smb://nas.local/media`), then add it to Login Items so it remounts after
a reboot. It appears under `/Volumes/<share>`.

Everything under `library.root` can be served. Dotfiles, `.DS_Store`,
`@eaDir` (Synology thumbnails), `#recycle`/`#snapshot` and symlinks that
point outside the root are skipped by both the gateway and the indexer. If
there's anything on the share you don't want reachable, point `root` at a
subdirectory.

## Who can do what

| Who             | Can                                          | How it's checked                                                     |
| --------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| Anyone          | Read files covered by a `media_public` rule  | Gateway's local copy of the rules, re-pulled every 30s               |
| Signed-in admin | Read everything                              | `pb_auth` cookie or `Authorization: Bearer`, checked with PocketBase |
| Signed-in admin | List, upload, mkdir, move, delete (`/api/*`) | `Authorization: Bearer` only, never the cookie                       |
| Anyone else     | Nothing (401)                                |                                                                      |

**Admin sessions.** For each request the gateway takes the viewer's
PocketBase session token, either from the `pb_auth` cookie every
`*.ryanzrau.dev` app already sets (`CookieAuthStore`) or from an
`Authorization: Bearer` header. It forwards that token to PocketBase's
`GET /api/custom/media/access` (`apps/pocketbase/pb_hooks/media.pb.js`),
which answers as that user: allowed only if `users.is_admin`. This is the
same technique llm-gateway uses for session tokens. A signed-in admin's
`<img src="https://cdn.ryanzrau.dev/...">` works with no JavaScript,
because the browser sends the cookie on its own.

- Answers are cached per token for `session_cache_seconds` (denials for
  5s), and simultaneous requests with the same token share one PocketBase
  call. A 200-thumbnail grid costs one access check, not 200.
- Fails closed. If PocketBase can't be reached, no new sessions are
  admitted, but sessions already cached keep working until they expire.

**Writes take the header only.** The `/api/*` routes ignore the cookie, so
another site can't make a signed-in browser upload or delete anything:
a cross-site form or `<img>` can send cookies but not an `Authorization`
header. They also refuse to run while the NAS looks unmounted, so an
upload can't land on the Mac's own disk under an empty mount point.

**The service account.** Both `gateway.py` and `indexer.py` log in as a
PocketBase service account. The indexer uses it to write the index. The
gateway uses it to pull the public-sharing rules and to update the index
right after its own uploads, moves and deletes. It is never used to decide
whether a viewer is an admin. Set it up once per fresh `pb_data` volume:

1. In the PocketBase admin UI, create a `users` record (e.g.
   `cdn-indexer@service.internal`) with `is_service` checked.
2. Put its email and password in `config.yaml` under
   `auth.service_email`/`service_password`.

`is_service` is one flag shared by every service account, so this account
can also call the llm-gateway's service routes. Keep `config.yaml` as
private as llm-gateway's.

## Public sharing

A `media_public` row makes one path public under a named collection
(lowercase letters, digits and dashes, e.g. `homepage`):

- **A file rule** covers exactly that file.
- **A folder rule** covers everything under that folder, including files
  added later.
- A path can be in several collections. A collection can mix files and
  folders.

Manage these from the admin page: open a file, or go into a folder, and add
it to a collection under **Public collections**. The gateway re-pulls the
rules every `public_refresh_seconds` (30), so a new share or a revoked one
takes effect within about half a minute. Browsers may keep a public file
for `public_cache_seconds` (1 hour) after that.

Public files are served at the same `/files/<path>` URL as always, just
without needing a session. That means anyone who can guess a path under a
public folder can view it; keep private things out of public folders.
Moving a file keeps its sharing. Deleting it removes its sharing, so a new
file later created at the same path isn't public by accident.

To show a collection on a page, e.g. the home page, list it from
PocketBase (no auth) and point `<img>` tags at the CDN:

```ts
const res = await fetch("https://api.ryanzrau.dev/api/custom/media/public/homepage");
const { files } = await res.json(); // [{ path, name, kind, mime, width, height, taken_at, description }]
```

```tsx
{
  files.map((f) => (
    <img
      key={f.path}
      src={`https://cdn.ryanzrau.dev/files/${encodeURI(f.path)}?w=1024`}
      alt={f.description}
    />
  ));
}
```

The listing returns at most 500 files, newest `taken_at` first, and only
display fields: never tags, camera or GPS location.

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

| Route                                  | Auth             | Purpose                                                                                                    |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------- |
| `GET /health`                          | no               | `library_mounted` and cache size/entries                                                                   |
| `GET` or `HEAD` `/files/<path>`        | admin, or public | The original file. Range requests work, so video seeking works.                                            |
| `GET` or `HEAD` `/files/<path>?w=<px>` | admin, or public | A WebP thumbnail, `w` px wide (EXIF rotation applied, never upscaled). `w` must be in `thumbnails.widths`. |
| `GET /api/list?path=<folder>`          | admin (Bearer)   | A folder's direct subfolders and files. Omit `path` for the root.                                          |
| `PUT /api/files/<path>`                | admin (Bearer)   | Upload: the raw request body is the file. 409 if it exists, unless `?overwrite=true`.                      |
| `POST /api/mkdir` `{path}`             | admin (Bearer)   | New folder. The parent must exist.                                                                         |
| `POST /api/move` `{from, to}`          | admin (Bearer)   | Rename or move a file or folder. Never overwrites. Tags, descriptions and sharing move with it.            |
| `DELETE /api/files/<path>`             | admin (Bearer)   | Move a file or folder to `.trash/<timestamp>/` in the library. Removes its sharing.                        |

Every response has an `X-Cache` header:

- `HIT`: served from the local cache.
- `MISS`: just copied or rendered into the cache.
- `STALE`: the NAS is unreachable, so a cached copy was served.
- `BYPASS`: the original is over `max_file_mb`, so it streams straight
  from the NAS uncached.

Errors:

- 401: not public, and no admin session.
- 404: no such file. Anything outside the root or hidden also returns 404.
- 415: a thumbnail was requested for something that isn't a renderable
  image.
- 503: the NAS is unreachable and nothing is cached.

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
- **Browsers cache too.** Admin-only files get `Cache-Control: private,
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
3. Upserts those rows into `media_files`.
4. Flags rows for files that no longer exist as `missing`, and unflags
   them if the files come back.

Unchanged files cost one `stat` each. Rows are never deleted, and tags and
descriptions are never touched, so a file that's moved temporarily or a
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

The collections are ordinary PocketBase collections (admin-only rules), so
an app queries them with the JS SDK:

```ts
// Tagged "beach", newest first
pb.collection("media_files").getList(1, 50, {
  filter: 'tags.name ?= "beach" && missing = false',
  sort: "-taken_at",
});

// Within 25 km of Portland
pb.collection("media_files").getList(1, 50, {
  filter: "geoDistance(location.lon, location.lat, -122.68, 45.52) < 25",
});

// Photos from July 2024
pb.collection("media_files").getList(1, 50, {
  filter: 'kind = "image" && taken_at >= "2024-07-01" && taken_at < "2024-08-01"',
});
```

```tsx
<img src={`https://cdn.ryanzrau.dev/files/${encodeURI(file.path)}?w=512`} />
```

Admins can edit `tags`, `description`, `taken_at`, `location` and `camera`.
The fields that describe the file on disk (`path`, `name`, `kind`, `mime`,
`size`, `mtime`, `missing`) belong to the indexer, and the update rule
rejects changes to them. If a file changes on disk, the indexer overwrites
its EXIF-derived fields from the new file.

## Limitations

- **Delete is a move to `.trash/`**, which nothing empties automatically.
  Clear it on the NAS by hand when you're sure.
- **Moves made outside the gateway lose metadata.** A file renamed over
  SMB looks to the indexer like a deleted file plus a new one, so its tags,
  description and sharing stay behind on the old (now `missing`) row. Move
  things from the admin page to keep them.
- **Uploads are one request per file**, streamed to the NAS, up to
  `uploads.max_mb` each.
- **No video thumbnails** (they would need ffmpeg). Videos serve as
  originals.
- **Home upload bandwidth is the ceiling on a cache miss.** The cache saves
  NAS reads, not WireGuard transfer. Thumbnails keep this cheap. There's no
  shared cache on the droplet; browser caching covers repeat views.
- **Public means public.** There are no unguessable or expiring share
  links. A public file is reachable by its plain path.
- **Unknown location is `{lat: 0, lon: 0}`**, because PocketBase's
  `geoPoint` has no null. Filter on `location.lat != 0` for "has a
  location".
- Every response carries a `sandbox` Content-Security-Policy, so an `.html`
  or `.svg` on the share can't run script on `cdn.ryanzrau.dev` and read
  the `.ryanzrau.dev` session cookie.
