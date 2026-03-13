#!/usr/bin/env python3
"""
Reads deploy.yml and generates a docker-compose.yml with:
- Traefik reverse proxy with Let's Encrypt
- One service per enabled app with proper Traefik labels
- Optional test deployment overlay via test-deploy.active.yml
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


def make_service_labels(name, fqdn, port):
    return [
        "traefik.enable=true",
        f"traefik.http.routers.{name}.rule=Host(`{fqdn}`)",
        f"traefik.http.routers.{name}.entrypoints=websecure",
        f"traefik.http.routers.{name}.tls.certresolver=le",
        f"traefik.http.services.{name}.loadbalancer.server.port={port}",
        f"traefik.http.middlewares.{name}-security.headers.stsSeconds=31536000",
        f"traefik.http.middlewares.{name}-security.headers.stsIncludeSubdomains=true",
        f"traefik.http.middlewares.{name}-security.headers.stsPreload=true",
        f"traefik.http.middlewares.{name}-security.headers.customFrameOptionsValue=ALLOWALL",
        f"traefik.http.middlewares.{name}-security.headers.contentTypeNosniff=true",
        f"traefik.http.middlewares.{name}-security.headers.browserXssFilter=true",
        f"traefik.http.middlewares.{name}-security.headers.referrerPolicy=strict-origin-when-cross-origin",
        f"traefik.http.routers.{name}.middlewares={name}-security",
    ]


# App services
enabled_apps = []
for name, app in config.get("apps", {}).items():
    if not app.get("enabled", False):
        continue

    subdomain = app["subdomain"]
    port = app.get("port", 80)
    fqdn = f"{subdomain}.{domain}" if subdomain else domain
    enabled_apps.append(name)

    service = {
        "image": f"{registry}/{name}:latest",
        "container_name": name,
        "restart": "unless-stopped",
        "labels": make_service_labels(name, fqdn, port),
        "networks": ["web"],
    }

    # Runtime environment variables (not baked into image)
    env_vars = app.get("environment", {})
    if env_vars:
        service["environment"] = env_vars

    services[name] = service

# Optional test deployment overlay
test_apps = []
if os.path.exists(TEST_CONFIG_PATH):
    with open(TEST_CONFIG_PATH) as f:
        test_config = yaml.safe_load(f)

    if test_config is None:
        test_config = []

    # Support both list format and legacy single-app format
    if isinstance(test_config, list):
        test_entries = test_config
    elif isinstance(test_config, dict):
        # Legacy: {app: "name"} or {app: "name", subdomain: "x", port: 80}
        if "app" in test_config:
            test_entries = [test_config]
        else:
            test_entries = []
    else:
        test_entries = []

    for entry in test_entries:
        if isinstance(entry, dict):
            app_name = entry.get("app") or entry.get("name")
        else:
            continue

        if not app_name:
            continue

        # Get subdomain/port from entry, fall back to deploy.yml
        subdomain = entry.get("subdomain")
        port = entry.get("port")

        if subdomain is None and app_name in config.get("apps", {}):
            subdomain = config["apps"][app_name]["subdomain"]
        if port is None and app_name in config.get("apps", {}):
            port = config["apps"][app_name].get("port", 80)

        if subdomain is None:
            print(
                f"Warning: test app '{app_name}' has no subdomain config, skipping"
            )
            continue

        port = port or 80
        test_fqdn = (
            f"test-{subdomain}.{domain}" if subdomain else f"test.{domain}"
        )
        test_name = f"{app_name}-test"

        services[test_name] = {
            "image": f"{registry}/{app_name}:test",
            "container_name": test_name,
            "restart": "unless-stopped",
            "labels": make_service_labels(test_name, test_fqdn, port),
            "networks": ["web"],
        }
        test_apps.append(f"{app_name} → {test_fqdn}")

compose = {
    "services": services,
    "volumes": {"letsencrypt": {}},
    "networks": {
        "web": {"driver": "bridge", "name": "traefik_web"},
    },
}

output_path = os.environ.get("COMPOSE_OUTPUT", "docker-compose.yml")
with open(output_path, "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print(f"Generated docker-compose.yml with enabled apps: {enabled_apps}")
for t in test_apps:
    print(f"  + test: {t}")
