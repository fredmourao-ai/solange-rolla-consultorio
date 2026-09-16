#!/usr/bin/env bash
set -euo pipefail
ROOT=${ROOT:-/home/ubuntu/solange-recovered}
DEMO=${DEMO:-/home/ubuntu/solange-client-demo}
ENV_FILE=${ENV_FILE:-$DEMO/demo.env}
IMAGE=${IMAGE:-solange-recurring-payables-worker:client-ready}
CONTAINER=${CONTAINER:-solange-recurring-payables-worker}
STATE_DIR=${STATE_DIR:-$DEMO/state}
[ -f "$ENV_FILE" ] || { echo "missing env file" >&2; exit 1; }
[ "$(stat -c '%a' "$ENV_FILE")" = 600 ] || { echo "env file mode must be 600" >&2; exit 1; }
mkdir -p "$STATE_DIR" && chmod 700 "$STATE_DIR"
docker build -f "$ROOT/ops/recurring-payables-worker/Dockerfile" -t "$IMAGE" "$ROOT"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --restart unless-stopped --network host \
  --env-file "$ENV_FILE" \
  -e RECURRING_PAYABLES_WORKER_HEALTH_FILE=/state/recurring-payables-worker.heartbeat \
  -v "$STATE_DIR:/state" "$IMAGE" >/dev/null
for _ in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null || true)" = running ] || { sleep 1; continue; }
  [ -f "$STATE_DIR/recurring-payables-worker.heartbeat" ] && exit 0
  sleep 1
done
echo "recurring payables worker failed readiness" >&2
docker logs --tail 20 "$CONTAINER" >&2 || true
exit 1
