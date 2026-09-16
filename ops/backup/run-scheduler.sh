#!/bin/sh
set -eu
SCRIPT=${SOLANGE_BACKUP_SCRIPT:-/backup.sh}
HEALTH_SCRIPT=${SOLANGE_BACKUP_HEALTH_SCRIPT:-/check-backup-health.sh}
INTERVAL=${SOLANGE_BACKUP_INTERVAL_SECONDS:-86400}
while true; do
  if "$SCRIPT"; then
    "$HEALTH_SCRIPT" || echo 'backup_monitor_failed: post-backup verification failed' >&2
  else
    echo 'backup_scheduler_run_failed' >&2
  fi
  sleep "$INTERVAL"
done
