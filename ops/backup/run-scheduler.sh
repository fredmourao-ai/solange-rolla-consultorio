#!/bin/sh
set -eu
SCRIPT=${SOLANGE_BACKUP_SCRIPT:-/backup.sh}
INTERVAL=${SOLANGE_BACKUP_INTERVAL_SECONDS:-86400}
while true; do
  "$SCRIPT"
  sleep "$INTERVAL"
done
