#!/usr/bin/env bash
set -Eeuo pipefail
root="$(git rev-parse --show-toplevel)"; cd "$root"
[ -d node_modules ] || npm ci
npm run lint
npm run typecheck
npm run test:run
npm run build
