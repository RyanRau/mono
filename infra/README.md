# Deployment Setup

This guide walks through setting up a Digital Ocean droplet to host all enabled apps from this monorepo.

## Architecture

- **Reverse proxy**: Traefik v2 handles subdomain routing and auto-provisions Let's Encrypt TLS certificates
- **Registry**: GitHub Container Registry (`ghcr.io`) — free with GitHub
- **CI/CD**: GitHub Actions builds Docker images and SSHs into the droplet to deploy
- **Config-driven**: `deploy.yml` in the repo root controls which apps are live

## Prerequisites

- A Digital Ocean droplet (or any Linux VPS)
- A domain name with DNS access
- A GitHub repo with Actions enabled

## 1. Droplet Setup

SSH into your droplet as root.

### Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin -y
```

### Install Python dependencies

```bash
apt install python3-pip -y
pip3 install pyyaml
```

### Create a deploy user

```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
```

### Clone the repo

```bash
su - deploy
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/RyanRau/mono.git .
```

## 2. SSH Key Pair

Generate a key pair for GitHub Actions to SSH into the droplet.

```bash
# On your local machine
ssh-keygen -t ed25519 -f deploy_key -C "github-actions-deploy"

# Copy the public key to the droplet
ssh-copy-id -i deploy_key.pub deploy@YOUR_DROPLET_IP
```

Keep the private key — you'll add it as a GitHub secret in the next step.

## 3. GitHub Secrets

In your GitHub repo, go to **Settings > Secrets and variables > Actions** and add:

| Secret           | Value                                          |
|------------------|------------------------------------------------|
| `DROPLET_IP`     | Your droplet's public IP address               |
| `SSH_PRIVATE_KEY` | Contents of the `deploy_key` private key file  |

`GITHUB_TOKEN` is automatically available — no need to create it.

## 4. DNS

Point your domain (or subdomains) to the droplet.

**Option A — Wildcard (recommended):**

| Type | Name | Value            |
|------|------|------------------|
| A    | *    | YOUR_DROPLET_IP  |

**Option B — Per-subdomain:**

| Type | Name     | Value            |
|------|----------|------------------|
| A    | @        | YOUR_DROPLET_IP  |
| A    | subdomain| YOUR_DROPLET_IP  |

_(Use `@` for the root domain, or specific names for subdomains)_

## 5. Configure deploy.yml

Edit `deploy.yml` in the repo root with your actual values:

```yaml
domain: yourdomain.com
registry: ghcr.io/ryanrau/mono
letsencrypt_email: you@yourdomain.com

apps:
  ryanzrau:
    subdomain: ""  # Empty string for root domain (yourdomain.com)
    enabled: true
    port: 80
  # Example of a subdomain app (would be at subdomain.yourdomain.com):
  # apping:
  #   subdomain: app
  #   enabled: true
  #   port: 80
```

## 6. First Deploy

Either push to `main` to trigger the GitHub Actions workflow, or deploy manually on the droplet:

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps
git pull origin main
python3 infra/generate-compose.py
docker compose up -d
```

## Debugging

```bash
ssh deploy@YOUR_DROPLET_IP
cd /opt/apps

# Check running containers
docker compose ps

# View logs for a specific app
docker compose logs -f ryanzrau

# View Traefik logs (routing issues)
docker compose logs -f traefik

# Manually regenerate and redeploy
python3 infra/generate-compose.py
docker compose up -d --remove-orphans
```

## Droplet Sizing

| Apps  | Droplet Size    | Monthly Cost |
|-------|-----------------|--------------|
| 1–3   | 1 GB / 1 vCPU   | ~$6          |
| 4–8   | 2 GB / 2 vCPU   | ~$18         |
| 8–15  | 4 GB / 2 vCPU   | ~$24         |

Traefik uses ~30MB RAM.

## Security Notes

- The `deploy` user has Docker access but is not root
- Docker socket is mounted read-only to Traefik
- Traefik's API dashboard is disabled
- HTTP automatically redirects to HTTPS
- Let's Encrypt certificates auto-renew
- Consider adding UFW firewall rules: `ufw allow 22,80,443/tcp`

## Test Subdomain Deployments

You can deploy any app to a test subdomain from a feature branch without impacting production. This lets you preview changes on a real URL before merging.

### How it works

1. A `test-deploy.yml` file in your branch declares which app to test
2. The **Test Deploy** workflow builds that app from your branch and pushes it with a `:test` image tag
3. On the droplet, a `test-deploy.active.yml` runtime file is written (gitignored) so `generate-compose.py` adds a test service alongside all prod services
4. On PR merge to main, the **Test Cleanup** workflow removes the test service automatically

### Test subdomain naming

The test subdomain is derived from the app's prod subdomain:

| App        | Prod URL                | Test URL                     |
|------------|-------------------------|------------------------------|
| `ryanzrau` | `ryanzrau.dev`          | `test.ryanzrau.dev`          |
| `bluestar` | `ui.ryanzrau.dev`       | `test-ui.ryanzrau.dev`       |
| `be_mine`  | `be-mine.ryanzrau.dev`  | `test-be-mine.ryanzrau.dev`  |

No DNS changes are needed — the wildcard `*.ryanzrau.dev` record covers all test subdomains.

### Step by step

**1. Add `test-deploy.yml` to your branch:**

```yaml
app: bluestar
```

The `app` value must match a key in `deploy.yml`.

**2. Push your branch and trigger the workflow:**

Go to **Actions > Test Deploy > Run workflow**, then select your branch from the dropdown.

**3. Visit the test URL:**

Your branch version is now live at the test subdomain (e.g., `test-ui.ryanzrau.dev`).

**4. Iterate:**

Push more changes to the branch, then re-run the Test Deploy workflow to update the test deployment.

**5. Merge to main:**

When your PR is merged, the **Test Cleanup** workflow runs automatically. It removes `test-deploy.active.yml` from the droplet, regenerates the compose file, and redeploys — the test container is removed by `--remove-orphans`.

### Limitations

- Only one test deployment can be active at a time (one `test-deploy.active.yml` on the droplet)
- The test deploy workflow must be triggered manually — it does not run on push
- If a prod deploy (`push to main`) happens while a test is active, the test service will persist because `test-deploy.active.yml` remains on the droplet
