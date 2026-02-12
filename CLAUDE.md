# Mono Repo

Personal monorepo for web apps deployed to `ryanzrau.dev` via Docker + Traefik on a Digital Ocean droplet.

## Repo Structure

```
web/              # Web applications (each has its own Dockerfile)
  ryanzrau/       # Portfolio site → ryanzrau.dev
  bluestar/       # UI component library (Storybook) → ui.ryanzrau.dev
  be_mine/        # Valentine card app → be-mine.ryanzrau.dev
local-event-digest/  # Python event scraper (runs on schedule, not deployed as a web app)
infra/            # Deployment tooling (generate-compose.py, README)
deploy.yml        # Source of truth for which apps are deployed and their subdomains
```

## Deployment

All deployment is config-driven via `deploy.yml` at the repo root. The CI pipeline (`deploy.yml` workflow) builds Docker images, pushes to GHCR, and deploys via SSH.

- `deploy.yml` — Controls which apps are live, their subdomains, and ports
- `infra/generate-compose.py` — Reads `deploy.yml` (and optionally `test-deploy.active.yml`) to generate `docker-compose.yml`
- Traefik handles subdomain routing and auto-provisions Let's Encrypt TLS
- Wildcard DNS (`*.ryanzrau.dev`) routes all subdomains to the droplet

### Adding a New App

1. Create `web/<app_name>/` with a `Dockerfile` that produces a static site served by nginx on port 80
2. Add the app to `deploy.yml`:
   ```yaml
   apps:
     new_app:
       subdomain: "my-app"  # → my-app.ryanzrau.dev (use "" for root domain)
       enabled: true
       port: 80
   ```
3. Push to `main` — the CI workflow detects changed files in `web/<app_name>/` and builds + deploys automatically

The Dockerfile should follow the existing two-stage pattern: build with `node:20-alpine`, serve with `nginx:alpine`. See any app in `web/` for reference.

## Test Subdomain Deployments

Any app can be deployed to a test subdomain from a feature branch without impacting production.

### How to use

1. Add `test-deploy.yml` to your feature branch:
   ```yaml
   app: bluestar
   ```
   The `app` value must match a key in `deploy.yml`.

2. Push the branch, then go to **Actions > Test Deploy > Run workflow** and select the branch.

3. The app is deployed to a test subdomain (e.g., `test-ui.ryanzrau.dev` for bluestar). Re-run the workflow to deploy updates.

4. When the PR is merged to main, the **Test Cleanup** workflow automatically removes the test deployment.

### Test subdomain naming

- Root domain app (subdomain: `""`) → `test.ryanzrau.dev`
- Subdomain app (subdomain: `"ui"`) → `test-ui.ryanzrau.dev`
- Subdomain app (subdomain: `"be-mine"`) → `test-be-mine.ryanzrau.dev`

### Key details

- Only one test deployment can be active at a time
- The workflow must be triggered manually (does not run on push)
- `test-deploy.yml` is the branch config (committed); `test-deploy.active.yml` is the droplet runtime state (gitignored)

## Code Quality

- ESLint + Prettier configured at repo root, enforced via PR validation workflow
- Python: Ruff for formatting, bandit + pip-audit for security (informational)
- PR validation auto-fixes lint/format issues and commits them

## Conventions

- App directory names use snake_case (e.g., `be_mine`)
- Subdomains use kebab-case (e.g., `be-mine`)
- Each app is self-contained in `web/<name>/` with its own `package.json`, `Dockerfile`, and `nginx.conf`
- No shared build tooling (no turborepo/nx) — apps are independent
- Docker images: `ghcr.io/ryanrau/mono/<app>:latest` for prod, `:test` for test deploys
