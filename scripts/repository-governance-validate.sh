#!/usr/bin/env bash
set -Eeuo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

[ -d node_modules ] || npm ci

git diff --check
git diff --cached --check
npm run lint
npm run typecheck
npm run arch:check
npm run modules:check
npm run migrations:check
npm run test:run -- --fileParallelism=false
node --test tests/dependabot-no-pr-contract.test.mjs

if [ -f tests/test_ai_conflict_resolver.py ]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests/test_ai_conflict_resolver.py
  elif command -v python >/dev/null 2>&1; then
    PYTHONDONTWRITEBYTECODE=1 python -m unittest tests/test_ai_conflict_resolver.py
  else
    echo 'BLOCKED: Python is required for the AI conflict resolver tests.' >&2
    exit 43
  fi
fi

npm run build
