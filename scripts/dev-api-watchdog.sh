#!/usr/bin/env bash
# Keep Quilax API alive on :3001 (light mode, Postgres 5433).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$ROOT/.local-services/node/bin"
export PATH="$NODE_BIN:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

API_DIR="$ROOT/quilax-backend"
LOG="$ROOT/.local-services/logs/api-3001.log"
WATCH_LOG="$ROOT/.local-services/logs/api-watchdog.log"
mkdir -p "$(dirname "$LOG")"

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5433/quilax_dev?schema=public}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export PORT=3001
export NODE_ENV=development
export DEV_LIGHT_WORKERS=true
export SKIP_EMAIL=true
export DB_POOL_SIZE="${DB_POOL_SIZE:-3}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=448}"

health() {
  curl -sf -m 2 "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1
}

start_api() {
  # Solo liberar el puerto API — nunca matar keep-pg / otros node.
  for p in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
    kill -9 "$p" 2>/dev/null || true
  done
  sleep 1
  cd "$API_DIR"
  nohup env \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PORT="$REDIS_PORT" \
    PORT="$PORT" \
    NODE_ENV=development \
    DEV_LIGHT_WORKERS=true \
    SKIP_EMAIL=true \
    DB_POOL_SIZE="$DB_POOL_SIZE" \
    NODE_OPTIONS="$NODE_OPTIONS" \
    node src/index.js >>"$LOG" 2>&1 &
  echo $! > /tmp/quilax-api.pid
  echo "[$(date '+%H:%M:%S')] started pid=$(cat /tmp/quilax-api.pid)" >>"$WATCH_LOG"
}

echo "[$(date '+%H:%M:%S')] watchdog start" >>"$WATCH_LOG"

while true; do
  if ! health; then
    echo "[$(date '+%H:%M:%S')] API down — restarting" >>"$WATCH_LOG"
    start_api
    for i in $(seq 1 70); do
      health && break
      sleep 1
    done
  fi
  sleep 8
done
