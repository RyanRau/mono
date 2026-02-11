#!/usr/bin/env python3
"""
Reads deploy.yml and generates a docker-compose.yml with:
- Traefik reverse proxy with Let's Encrypt
- One service per enabled app with proper Traefik labels
"""

import yaml
import sys
import os

CONFIG_PATH = os.environ.get("CONFIG_PATH", "deploy.yml")

with open(CONFIG_PATH) as f:
    config = yaml.safe_load(f)

domain = config["domain"]
registry = config["registry"]
email = config["letsencrypt_email"]

services = {}

# Traefik reverse proxy
services["traefik"] = {
    "image": "traefik:v2.11",
    "container_name": "traefik",
    "restart": "unless-stopped",
    "command": [
        "--api.dashboard=false",
        "--providers.docker=true",
        "--providers.docker.exposedbydefault=false",
        "--entrypoints.web.address=:80",
        "--entrypoints.websecure.address=:443",
        "--entrypoints.web.http.redirections.entrypoint.to=websecure",
        "--entrypoints.web.http.redirections.entrypoint.scheme=https",
        "--certificatesresolvers.le.acme.httpchallenge=true",
        "--certificatesresolvers.le.acme.httpchallenge.entrypoint=web",
        f"--certificatesresolvers.le.acme.email={email}",
        "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json",
    ],
    "ports": ["80:80", "443:443"],
    "volumes": [
        "/var/run/docker.sock:/var/run/docker.sock:ro",
        "letsencrypt:/letsencrypt",
    ],
    "networks": ["web"],
}

# App services
enabled_apps = []
for name, app in config.get("apps", {}).items():
    if not app.get("enabled", False):
        continue

    subdomain = app["subdomain"]
    port = app.get("port", 3000)
    fqdn = f"{subdomain}.{domain}"
    enabled_apps.append(name)

    services[name] = {
        "image": f"{registry}/{name}:latest",
        "container_name": name,
        "restart": "unless-stopped",
        "labels": [
            "traefik.enable=true",
            f"traefik.http.routers.{name}.rule=Host(`{fqdn}`)",
            f"traefik.http.routers.{name}.entrypoints=websecure",
            f"traefik.http.routers.{name}.tls.certresolver=le",
            f"traefik.http.services.{name}.loadbalancer.server.port={port}",
        ],
        "networks": ["web"],
    }

compose = {
    "version": "3.8",
    "services": services,
    "volumes": {"letsencrypt": {}},
    "networks": {
        "web": {"driver": "bridge"},
    },
}

output_path = os.environ.get("COMPOSE_OUTPUT", "docker-compose.yml")
with open(output_path, "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print(f"Generated docker-compose.yml with enabled apps: {enabled_apps}")
