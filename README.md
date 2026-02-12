# Mono

Monorepo hosting web apps and services deployed to ryanzrau.dev via Docker and Traefik.

## Structure

```
├── web/
│   ├── ryanzrau/      # Main website (ryanzrau.dev)
│   └── bluestar/      # Component library (ui.ryanzrau.dev)
├── local-event-digest/ # Event digest service
└── infra/             # Deployment scripts
```

## Local Development

### Web Apps

**ryanzrau (Main Site)**

```bash
cd web/ryanzrau
npm install
npm start              # Dev server on http://localhost:3000
npm run build          # Production build
```

**bluestar (Component Library)**

```bash
cd web/bluestar
npm install
npm run storybook      # Storybook on http://localhost:6006
npm run build          # Build library
npm run build-storybook # Build static site
```

### Event Digest Service

```bash
cd local-event-digest
pip install -r requirements.txt

# Create .env file with:
# ANTHROPIC_API_KEY=sk-ant-xxxxx
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=user@example.com
# SMTP_PASSWORD=xxxxx
# EMAIL_FROM=from@example.com
# EMAIL_TO=to@example.com

python main.py              # Run with AI summarization
python main.py --scrape-only # Scrape only, no AI
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
ANTHROPIC_API_KEY   # For event digest service
SMTP_HOST           # Email server
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
EMAIL_FROM
EMAIL_TO
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
