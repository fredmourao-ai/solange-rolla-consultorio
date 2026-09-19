#!/usr/bin/env bash
set -euo pipefail
ROOT=${STAGING_DEPLOY_ROOT:-/home/ubuntu/solange-client-demo}
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1
STATE="$ROOT/state"
[ -d "$ROOT/app" ] && [ -d "$STATE" ] || { echo "housekeeping_refused: invalid staging root" >&2; exit 2; }
CURRENT_SHA=$(cat "$STATE/deployed-sha.txt" 2>/dev/null || true)
[[ "$CURRENT_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "housekeeping_refused: invalid deployed sha" >&2; exit 2; }
ACTIVE_CANDIDATE="$STATE/candidate-$CURRENT_SHA"
remove_path() {
  if [ "$DRY_RUN" -eq 1 ]; then echo "would_remove:$1"; return; fi
  if ! rm -rf -- "$1" 2>/dev/null; then
    parent=$(dirname "$1"); base=$(basename "$1")
    case "$parent" in "$ROOT"|"$STATE") ;; *) echo "housekeeping_refused: unsafe fallback path $1" >&2; exit 4 ;; esac
    docker run --rm -v "$parent:/cleanup" docker:27-cli rm -rf -- "/cleanup/$base"
  fi
  [ ! -e "$1" ] || { echo "housekeeping_failed: could not remove $1" >&2; exit 4; }
  echo "removed:$1"
}
count=0
for path in "$ROOT"/app-stage-* "$STATE"/candidate-*; do
  [ -e "$path" ] || continue
  [ "$path" = "$ACTIVE_CANDIDATE" ] && continue
  [ "$path" = "$ROOT/app" ] && continue
  count=$((count+1))
  [ "$count" -le 20 ] || { echo "housekeeping_refused: safety limit exceeded" >&2; exit 3; }
  remove_path "$path"
done
# Only known stopped release containers are eligible. Never touch running containers.
for name in solange-client-demo-web-previous solange-document-worker-previous solange-messaging-worker-previous solange-recurring-payables-worker-previous; do
  if docker inspect "$name" >/dev/null 2>&1; then
    running=$(docker inspect -f '{{.State.Running}}' "$name")
    [ "$running" = false ] || continue
    if [ "$DRY_RUN" -eq 1 ]; then echo "would_remove_container:$name"; else docker rm "$name" >/dev/null; echo "removed_container:$name"; fi
  fi
done
echo "housekeeping_ok dry_run=$DRY_RUN removed_candidates=$count active_candidate=$ACTIVE_CANDIDATE"
