#!/usr/bin/env bash
# Runs every time the container starts. Clones the repo into /workspace on
# first boot only (a named volume there makes that persist across restarts);
# after that it just makes sure dependencies are current, then stays alive
# for VS Code to attach to.
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:RyanRau/mono.git}"
REPO_REF="${REPO_REF:-main}"
REPO_DIR="/workspace/mono"

# ~/.ssh is bind-mounted in read-only (the documented way to give this
# container your GitHub identity) so we never write into it directly — a
# known_hosts file lives in /tmp instead, and accept-new trusts github.com's
# key on first contact without needing to pre-populate anything.
SSH_CONFIG_ARGS=""
if [ -f /root/.ssh/config ]; then
  # macOS's ssh config commonly has `UseKeychain` (added by ssh-add
  # --apple-use-keychain) -- an Apple-only directive that mainline OpenSSH,
  # what this Linux image ships, refuses to parse at all: it aborts before
  # even attempting a connection. Strip it from a copy rather than editing
  # the mounted (read-only) file in place; everything else -- IdentityFile,
  # Host aliases -- still applies from it.
  grep -iv '^[[:space:]]*UseKeychain\b' /root/.ssh/config >/tmp/ssh_config || true
  SSH_CONFIG_ARGS="-F /tmp/ssh_config"
fi
export GIT_SSH_COMMAND="ssh $SSH_CONFIG_ARGS -o UserKnownHostsFile=/tmp/known_hosts -o StrictHostKeyChecking=accept-new"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Cloning $REPO_URL@$REPO_REF into $REPO_DIR..."
  git clone --branch "$REPO_REF" "$REPO_URL" "$REPO_DIR"
else
  echo "$REPO_DIR already has a checkout — leaving it as-is (this volume persists across restarts)."
fi

if [ -f "$REPO_DIR/package.json" ]; then
  ( cd "$REPO_DIR" && npm install && npm run bootstrap ) \
    || echo "warning: 'npm install && npm run bootstrap' failed — re-run it by hand once attached."
fi

echo
echo "Ready. In VS Code: Cmd/Ctrl+Shift+P -> 'Dev Containers: Attach to Running Container...' -> this container, then open /workspace/mono."
echo "From its integrated terminal: infra/devbox/devbox up --local"

exec sleep infinity
