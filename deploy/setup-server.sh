#!/usr/bin/env bash
#
# Installs or updates pratinavv on an Ubuntu server. Safe to run again: running it later updates the bot.
#
#   curl -fsSL https://raw.githubusercontent.com/pratinavv/rust_bot/main/deploy/setup-server.sh -o setup-server.sh
#   sudo bash setup-server.sh
#
set -euo pipefail

REPO_URL="https://github.com/pratinavv/rust_bot.git"
APP_DIR="/opt/pratinavv"
APP_USER="pratinavv"
NODE_LINE="latest-v24.x"

if [[ "$(id -u)" -ne 0 ]]; then
    echo "Please run this with sudo." >&2
    exit 1
fi

case "$(uname -m)" in
    aarch64) NODE_ARCH="arm64" ;;
    x86_64) NODE_ARCH="x64" ;;
    *) echo "Unsupported processor: $(uname -m)" >&2; exit 1 ;;
esac

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates xz-utils graphicsmagick unattended-upgrades

echo "==> Installing Node.js"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT
curl -fsSL "https://nodejs.org/dist/${NODE_LINE}/SHASUMS256.txt" -o "$WORK_DIR/SHASUMS256.txt"
NODE_FILE="$(grep -oE "node-v[0-9.]+-linux-${NODE_ARCH}\.tar\.xz" "$WORK_DIR/SHASUMS256.txt" | head -n 1)"
NODE_VERSION="$(echo "$NODE_FILE" | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+')"
if [[ "$(/usr/local/bin/node --version 2>/dev/null || true)" != "$NODE_VERSION" ]]; then
    curl -fsSL "https://nodejs.org/dist/${NODE_LINE}/${NODE_FILE}" -o "$WORK_DIR/$NODE_FILE"
    (cd "$WORK_DIR" && grep " ${NODE_FILE}\$" SHASUMS256.txt | sha256sum -c -)
    tar -xJf "$WORK_DIR/$NODE_FILE" -C /usr/local --strip-components=1 --no-same-owner
fi
echo "    Node.js $(/usr/local/bin/node --version)"

echo "==> Preparing the bot account"
if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/var/lib/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
fi

echo "==> Getting the code"
if [[ -d "$APP_DIR/.git" ]]; then
    # Installing can touch tracked files such as the lockfile. .env and data/ are ignored by git, so they are safe.
    git -c safe.directory="$APP_DIR" -C "$APP_DIR" fetch --depth 1 origin main
    git -c safe.directory="$APP_DIR" -C "$APP_DIR" reset --hard FETCH_HEAD
else
    git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
install -d -m 700 -o "$APP_USER" -g "$APP_USER" "$APP_DIR/data"
chown -R root:root "$APP_DIR/deploy"
chmod 755 "$APP_DIR/deploy/import-data.sh" "$APP_DIR/deploy/backup.sh"

echo "==> Installing packages (this can take a few minutes)"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R root:root "$APP_DIR/deploy" "$APP_DIR/.git"
cd "$APP_DIR"
sudo -u "$APP_USER" env PATH="/usr/local/bin:$PATH" HOME="/var/lib/$APP_USER" npm ci --no-audit --no-fund

echo "==> Setting up the service and daily backups"
install -m 644 "$APP_DIR/deploy/pratinavv.service" /etc/systemd/system/pratinavv.service
cat > /etc/cron.d/pratinavv-backup <<EOF
30 3 * * * root $APP_DIR/deploy/backup.sh >/dev/null 2>&1
EOF
chmod 644 /etc/cron.d/pratinavv-backup
systemctl daemon-reload

if [[ -f "$APP_DIR/.env" ]] && systemctl is-enabled --quiet pratinavv; then
    systemctl restart pratinavv
    echo
    echo "Updated and restarted. Check it with: sudo systemctl status pratinavv"
else
    echo
    echo "Installed, but not started yet. Upload .env and data/ next, then run:"
    echo "    sudo $APP_DIR/deploy/import-data.sh"
fi
