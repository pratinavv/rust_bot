#!/usr/bin/env bash
#
# Moves the uploaded .env and data/ into place, locks them down and starts the bot.
# Stop the bot on your PC first: two running copies would both answer commands.
#
set -euo pipefail

APP_DIR="/opt/pratinavv"
APP_USER="pratinavv"
UPLOAD_DIR="${1:-/tmp/pratinavv-upload}"

if [[ "$(id -u)" -ne 0 ]]; then
    echo "Please run this with sudo." >&2
    exit 1
fi
if [[ ! -f "$UPLOAD_DIR/.env" || ! -d "$UPLOAD_DIR/data" ]]; then
    echo "Could not find .env and data/ in $UPLOAD_DIR" >&2
    exit 1
fi
if [[ -n "$(find "$APP_DIR/data" -mindepth 1 -print -quit 2>/dev/null)" ]]; then
    echo "$APP_DIR/data already has files, so nothing was changed." >&2
    echo "Delete it yourself first if you really want to replace it." >&2
    exit 1
fi

systemctl stop pratinavv 2>/dev/null || true

# The file may come from Windows, so remove any Windows line endings.
tr -d '\r' < "$UPLOAD_DIR/.env" > "$APP_DIR/.env"
if ! grep -qE '^RPP_DISCORD_TOKEN=.+' "$APP_DIR/.env" || ! grep -qE '^RPP_DISCORD_CLIENT_ID=.+' "$APP_DIR/.env"; then
    rm -f "$APP_DIR/.env"
    echo "The uploaded .env is missing the bot token or application ID." >&2
    exit 1
fi
chown root:"$APP_USER" "$APP_DIR/.env"
chmod 640 "$APP_DIR/.env"

cp -a "$UPLOAD_DIR/data/." "$APP_DIR/data/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"
chmod -R u=rwX,go= "$APP_DIR/data"

rm -rf "$UPLOAD_DIR"

systemctl enable --now pratinavv
sleep 5
systemctl --no-pager --lines=5 status pratinavv || true
echo
echo "Done. See live logs with: sudo journalctl -u pratinavv -f"
