#!/usr/bin/env bash
#
# Saves .env and data/ to /var/backups/pratinavv and keeps the newest 7 backups.
# These hold the bot token and player credentials. They stay on this server, so also copy one somewhere private now and then.
#
set -euo pipefail

APP_DIR="/opt/pratinavv"
BACKUP_DIR="/var/backups/pratinavv"
KEEP=7

umask 077
install -d -m 700 "$BACKUP_DIR"

FILE="$BACKUP_DIR/pratinavv-$(date +%Y-%m-%d-%H%M).tar.gz"
tar -czf "$FILE" -C "$APP_DIR" --exclude='data/maps' .env data

ls -1t "$BACKUP_DIR"/pratinavv-*.tar.gz | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "$FILE"
