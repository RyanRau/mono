# mono

A monorepo for web apps, services, and projects. Each app lives in its own directory and can be independently deployed as a Docker container to a single Digital Ocean droplet, with automatic HTTPS and subdomain routing via Traefik.

## Structure

```
mono/
├── web/                    # Web applications
│   └── ryanrau/            # React TypeScript app → ryanrau.mydomain.com
├── local-event-digest/     # Weekly local event digest emailer
├── infra/                  # Deployment infrastructure
│   └── generate-compose.py # Generates docker-compose.yml from deploy.yml
├── deploy.yml              # Controls which apps are live
└── .github/workflows/
    ├── deploy.yml          # CI/CD: build, push, deploy on merge to main
    └── weekly-digest.yml   # Scheduled digest workflow
```

## Deployment

Apps in `web/` are deployed as Docker containers behind a Traefik reverse proxy. The entire system is controlled by a single config file.

### How it works

```
Internet → Traefik (ports 80/443, auto HTTPS)
             └── ryanrau.mydomain.com → ryanrau container
```

1. Push to `main`
2. GitHub Actions builds Docker images for enabled apps that changed
3. Images are pushed to GitHub Container Registry (`ghcr.io`)
4. Actions SSHs into the droplet, regenerates `docker-compose.yml`, and deploys

### Adding a new app

1. Create `web/<name>/` with a `Dockerfile` and source code
2. Add an entry to `deploy.yml`:
   ```yaml
   myapp:
     subdomain: myapp
     enabled: false
     port: 3000
   ```
3. Push to `main` — nothing deploys yet

### Taking an app live

1. Set `enabled: true` in `deploy.yml`
2. Push to `main` — it's live at `<subdomain>.mydomain.com` with HTTPS

### Taking an app offline

1. Set `enabled: false` in `deploy.yml`
2. Push to `main` — the container is removed

## Setup

See [infra/README.md](infra/README.md) for full droplet and deployment setup instructions.
