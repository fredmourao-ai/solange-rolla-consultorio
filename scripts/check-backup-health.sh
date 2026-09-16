#!/bin/sh
set -eu
DEST=${SOLANGE_BACKUP_DEST:-/home/ubuntu/solange-client-demo/backups}
MAX_AGE=${SOLANGE_BACKUP_MAX_AGE_SECONDS:-90000}
LAST="$DEST/LAST_SUCCESS"
fail() { echo "backup_unhealthy: $1" >&2; exit 1; }
case "$MAX_AGE" in ''|*[!0-9]*) fail config ;; esac
[ -d "$DEST" ] || fail destination
[ -s "$LAST" ] || fail last_success
NOW=${SOLANGE_BACKUP_NOW_EPOCH:-$(date +%s)}
case "$NOW" in ''|*[!0-9]*) fail clock ;; esac
MTIME=$(stat -c %Y "$LAST" 2>/dev/null || true)
case "$MTIME" in ''|*[!0-9]*) fail last_success_mtime ;; esac
AGE=$((NOW - MTIME))
[ "$AGE" -ge 0 ] || fail clock_skew
[ "$AGE" -le "$MAX_AGE" ] || fail stale
LINE=$(cat "$LAST")
FULL=$(printf '%s\n' "$LINE" | sed -n 's/.* full=\([^ ]*\).*/\1/p')
SUBSET=$(printf '%s\n' "$LINE" | sed -n 's/.* restore_subset=\([^ ]*\).*/\1/p')
[ -n "$FULL" ] && [ -n "$SUBSET" ] || fail metadata
for NAME in "$FULL" "$SUBSET"; do
  case "$NAME" in */*|'') fail metadata ;; esac
  FILE="$DEST/$NAME"
  SUM="$FILE.sha256"
  [ -s "$FILE" ] && [ -s "$SUM" ] || fail artifact
  EXPECTED=$(awk 'NR==1 {print $1}' "$SUM")
  ACTUAL=$(sha256sum "$FILE" | awk '{print $1}')
  [ -n "$EXPECTED" ] && [ "$EXPECTED" = "$ACTUAL" ] || fail checksum
done
echo "backup_healthy: age_seconds=$AGE full=$FULL restore_subset=$SUBSET"
