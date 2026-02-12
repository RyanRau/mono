#!/usr/bin/env python3
"""
Reads deploy.yml and generates a docker-compose.yml with:
- Traefik reverse proxy with Let's Encrypt
- One service per enabled app with proper Traefik labels
- Optional test deployment overlay via test-deploy.yml
"""

import yaml
import os

CONFIG_PATH = os.environ.get("CONFIG_PATH", "deploy.yml")
TEST_CONFIG_PATH = os.environ.get("TEST_CONFIG_PATH", "test-deploy.active.yml")

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
    fqdn = f"{subdomain}.{domain}" if subdomain else domain
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
            # HSTS middleware - enforce HTTPS for 1 year
            f"traefik.http.middlewares.{name}-security.headers.stsSeconds=31536000",
            f"traefik.http.middlewares.{name}-security.headers.stsIncludeSubdomains=true",
            f"traefik.http.middlewares.{name}-security.headers.stsPreload=true",
            # Additional security headers
            f"traefik.http.middlewares.{name}-security.headers.customFrameOptionsValue=ALLOWALL",
            f"traefik.http.middlewares.{name}-security.headers.contentTypeNosniff=true",
            f"traefik.http.middlewares.{name}-security.headers.browserXssFilter=true",
            f"traefik.http.middlewares.{name}-security.headers.referrerPolicy=strict-origin-when-cross-origin",
            # Apply security middleware to router
            f"traefik.http.routers.{name}.middlewares={name}-security",
        ],
        "networks": ["web"],
    }

# Optional test deployment overlay
test_app = None
if os.path.exists(TEST_CONFIG_PATH):
    with open(TEST_CONFIG_PATH) as f:
        test_config = yaml.safe_load(f)

    test_app = test_config.get("app")
    if test_app and test_app in config.get("apps", {}):
        app = config["apps"][test_app]
        subdomain = app["subdomain"]
        port = app.get("port", 3000)
        test_fqdn = f"test-{subdomain}.{domain}" if subdomain else f"test.{domain}"
        test_name = f"{test_app}-test"

        services[test_name] = {
            "image": f"{registry}/{test_app}:test",
            "container_name": test_name,
            "restart": "unless-stopped",
            "labels": [
                "traefik.enable=true",
                f"traefik.http.routers.{test_name}.rule=Host(`{test_fqdn}`)",
                f"traefik.http.routers.{test_name}.entrypoints=websecure",
                f"traefik.http.routers.{test_name}.tls.certresolver=le",
                f"traefik.http.services.{test_name}.loadbalancer.server.port={port}",
                f"traefik.http.middlewares.{test_name}-security.headers.stsSeconds=31536000",
                f"traefik.http.middlewares.{test_name}-security.headers.stsIncludeSubdomains=true",
                f"traefik.http.middlewares.{test_name}-security.headers.stsPreload=true",
                f"traefik.http.middlewares.{test_name}-security.headers.customFrameOptionsValue=ALLOWALL",
                f"traefik.http.middlewares.{test_name}-security.headers.contentTypeNosniff=true",
                f"traefik.http.middlewares.{test_name}-security.headers.browserXssFilter=true",
                f"traefik.http.middlewares.{test_name}-security.headers.referrerPolicy=strict-origin-when-cross-origin",
                f"traefik.http.routers.{test_name}.middlewares={test_name}-security",
            ],
            "networks": ["web"],
        }
        print(f"Test deployment: {test_app} → {test_fqdn}")
    elif test_app:
        print(
            f"Warning: test app '{test_app}' not found in deploy.yml, skipping test overlay"
        )

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
if test_app and test_app in config.get("apps", {}):
    print(f"  + test service: {test_app}-test")
