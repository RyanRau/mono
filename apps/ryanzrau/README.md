# ryanzrau

The personal site at [ryanzrau.dev](https://ryanzrau.dev) — the root-domain app
(`subdomain: ""` in the repo-root `deploy.yml`).

`Landing.tsx` — a warm "nature journal" personal-site page (bio, experience,
skills, personal projects, hobbies) that intentionally sits outside
bluestar's dashboard look, styled with its own hardcoded palette rather than
`useTheme()` — is the root path either way, signed in or out. Everything
else (`/apps`, `/admin`, `/settings`, and the signed-in home nav) uses
bluestar's stock `defaultTheme`/`darkTheme`, unmodified — this app's
`ThemeProvider` in `main.tsx` carries no `theme`/`darkTheme` override, so
the warm palette is Landing's alone and never leaks into the actual
dashboard UI.

Signed out, Landing's top-right pill opens a `LoginForm` modal; signed in,
it's a plain "Welcome, {name}" label instead, and a hamburger appears in the
top-left corner (icon-only; hovering just outlines it, no label) that opens
the dashboard nav (Home, Apps, Admin, Settings, account) in a `Drawer`
overlay instead of a permanent sideNav rail — the home page should read as
ryanzrau.dev's home, not as dashboard chrome, even for the signed-in owner.
The drawer is exactly the same `SideNav` instance `/apps`, `/admin`, and
`/settings` render inside `AppShell`'s own rail (a "Home" item there just
links back to `/`) — not forced full-width/non-collapsible, so its own
collapse toggle works the same way there too, and the panel's width
(`Drawer`'s `width="fit-content"`) follows it in and out. `header={false}`
drops `Drawer`'s own title bar and close button entirely: the `SideNav`
content (`AppSwitcher`'s brand row at the top) reads as if it were just
there, with no extra chrome above it — Esc and a backdrop click are still
how it closes.

`AppSwitcher.tsx` is a thin wrapper around bluestar's shared `AppSwitcher`
component (see `packages/PACKAGES.md`) — it only fetches this viewer's apps
and builds the `entries` array; the switcher itself, and each entry's icon
(resolved from its `slug` via bluestar's `AppIcon`), are the same everywhere
in the repo. This app's own brand mark is a small "R" monogram badge —
shown beside "Ryan Rau" when the rail is expanded, and alone, via `SideNav`'s
`collapsedTop`, in the rail's "brand spot" when collapsed (a plain badge
rather than reusing an icon like `home`, since the "Home" nav item right
below it already owns that glyph — two identical icons stacked with nothing
to distinguish them read as a rendering mistake, not branding).

The Personal Projects section fetches `GET /api/custom/public-apps`
(`apps/pocketbase/pb_hooks/registry_public.pb.js`) — the subset of
PocketBase's `registry_apps` collection marked `public: true`
(`apps/pocketbase/pb_migrations/1789099600_registry_apps_public.js`). This is
the same catalog that backs the signed-in Apps dashboard, which fetches the
full (auth-gated) collection directly instead. Both pages draw the same
bluestar `AppIcon` per app slug rather than the emoji `registry_apps` itself
stores — a slug with no matching icon falls back to a generic mark. Mark a
new app public in the Admin UI (`registry_apps` → the app's row → `public`)
to add it to the home page too.

## Admin: Access and CDN tabs

`/admin` (admins only) has two tabs, kept in the URL (`/admin`,
`/admin?tab=cdn&path=<folder>`) so a reload or a shared link lands in the
same place:

- **Access** (`AdminPage.tsx`): which users can open which apps, invites.
- **CDN** (`CdnAdmin.tsx`): the NAS library behind
  [`home-server/cdn-gateway`](../../home-server/cdn-gateway/README.md).
  Browse by folder; upload, create folders, rename/move and delete (to the
  library's `.trash/`) through the gateway's admin `/api/` routes; and edit
  what lives in PocketBase: who can see each file (owner, visibility,
  sharing), tags and descriptions (`cdn_files`, `cdn_tags`), and which
  files or folders are in which public collection (`cdn_public`).

The CDN tab talks to the gateway with the signed-in session as a Bearer
token (`src/cdn.ts`), and loads thumbnails as plain `<img>` URLs, which
carry the shared `.ryanzrau.dev` cookie. For local development against a
local gateway, set `VITE_CDN_URL` (e.g. `http://localhost:8001`) alongside
`VITE_PB_URL`, and use `localhost` for both rather than `127.0.0.1` so the
local auth cookie reaches the gateway for thumbnails.

## Local development

```bash
npm run bootstrap            # once per clone, from the repo root: builds bluestar
cd apps/ryanzrau
npm install
npm run dev                  # http://localhost:5173
npm run build                # type-check + production build into dist/
```

After changing `packages/bluestar`, rebuild it (`npm --prefix packages/bluestar run build`)
so this app picks up the change — apps import bluestar's `dist/`, not its source.

## Stack

React + TypeScript + Vite, with [bluestar](../../packages/bluestar) for UI.
It authenticates against the shared PocketBase backend the same way every
other app does (`src/pb.ts`, `src/useAuth.ts`, `src/CookieAuthStore.ts` — a
hand-copy of `infra/templates/app`'s auth files, predating the scaffolder),
but has no collection of its own; the admin page's CDN tab edits the
`cdn_*` collections owned by `home-server/cdn-gateway`. If it needs data
of its own, add a collection the same way scaffolded apps do (see
`apps/pocketbase/README.md`).

## Deployment

Built by the two-stage `Dockerfile` here (bluestar → app → nginx) and served by
`nginx.conf`. Pushing to `main` builds and deploys it.
