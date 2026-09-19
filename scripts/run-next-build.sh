#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
LOG="$(mktemp)"
START_EPOCH="$(date +%s)"
cleanup() { rm -f "$LOG"; }
trap cleanup EXIT

set +e
"$ROOT/node_modules/.bin/next" build 2>&1 | tee "$LOG"
NEXT_RC="${PIPESTATUS[0]}"
set -e

if grep -Fq 'Another next build process is already running.' "$LOG"; then
  echo 'BUILD_FAILED: concurrent Next.js build refusal detected' >&2
  exit 73
fi
[ "$NEXT_RC" -eq 0 ] || exit "$NEXT_RC"
[ -s .next/BUILD_ID ] || { echo 'BUILD_FAILED: .next/BUILD_ID missing' >&2; exit 74; }
BUILD_MTIME="$(stat -c %Y .next/BUILD_ID)"
[ "$BUILD_MTIME" -ge "$START_EPOCH" ] || { echo 'BUILD_FAILED: stale .next/BUILD_ID' >&2; exit 75; }
grep -Fq 'Compiled successfully' "$LOG" || { echo 'BUILD_FAILED: compile success marker missing' >&2; exit 76; }
grep -Fq 'Route (app)' "$LOG" || { echo 'BUILD_FAILED: route manifest marker missing' >&2; exit 77; }
