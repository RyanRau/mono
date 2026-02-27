# Mono

Monorepo hosting web apps and services deployed to ryanzrau.dev via Docker and Traefik.

## Structure

```
├── apps/
│   ├── ryanzrau/      # Main website (ryanzrau.dev)
│   ├── bluestar/      # Storybook static site (ui.ryanzrau.dev)
│   └── be_mine/       # Valentine card app (not currently deployed)
├── packages/
│   └── bluestar/      # React component library source
└── infra/             # Deployment scripts
```

## Local Development

### Web Apps

**ryanzrau (Main Site)**

```bash
cd apps/ryanzrau
npm install
npm run dev            # Dev server on http://localhost:5173
npm run build          # Production build
```

**bluestar (Component Library)**

```bash
cd packages/bluestar
npm install
npm run storybook      # Storybook on http://localhost:6006
npm run build          # Build library
npm run build-storybook # Build static Storybook site
```

## Deployment

Configured via `deploy.yml`. GitHub Actions automatically:

1. Build Docker images for changed apps
2. Push to GitHub Container Registry
3. SSH to droplet and deploy via docker-compose

### Required GitHub Secrets

```
DROPLET_IP          # VPS IP address
DROPLET_SSH_KEY     # SSH private key for deploy user
```

### Manual Deployment

```bash
# On droplet as deploy user
cd /home/deploy/mono
git pull
python3 infra/generate-compose.py
docker compose pull
docker compose up -d
```

## DNS Setup

Point DNS to droplet IP:

- `ryanzrau.dev` → A record
- `*.ryanzrau.dev` → A record (wildcard)

Traefik handles HTTPS via Let's Encrypt automatically.
