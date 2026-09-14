#!/usr/bin/env bash
# Quilax local stack — un solo comando fiable.
# Uso: ./scripts/dev-up.sh
# Opcional: SKIP_EXPO=1 ./scripts/dev-up.sh   (solo PG+Redis+API)
#          SKIP_MIGRATE=1 ./scripts/dev-up.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$ROOT/.local-services/node/bin"
REDIS_BIN="$ROOT/.local-services/cellar/redis/8.10.1/bin"
export PATH="$NODE_BIN:$REDIS_BIN:/usr/bin:/bin:/usr/sbin:/sbin${PATH:+:$PATH}"

LOG_DIR="$ROOT/.local-services/logs"
PID_DIR="$ROOT/.local-services/pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5433/quilax_dev?schema=public}"
export DATABASE_URL
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export PORT="${PORT:-3001}"
export NODE_ENV=development
export DEV_LIGHT_WORKERS=true
export SKIP_EMAIL="${SKIP_EMAIL:-true}"
export DB_POOL_SIZE="${DB_POOL_SIZE:-3}"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=448}"

tcp_up() {
  local port="$1"
  node -e "const n=require('net');const s=n.connect($port,'127.0.0.1',()=>{process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),600);" >/dev/null 2>&1
}

http_ok() {
  curl -sf -m 2 "$1" >/dev/null 2>&1
}

is_alive() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' <"$pidfile")"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

echo "▶ Quilax dev-up"
echo "  root: $ROOT"

# --- Postgres :5433 (embedded, persistent) ---
if tcp_up 5433; then
  echo "✓ Postgres ya en :5433"
else
  echo "▶ Postgres embebido :5433…"
  # Clear stale lock
  PIDFILE="$ROOT/.local-services/embedded-pg-data/postmaster.pid"
  if [[ -f "$PIDFILE" ]]; then
    SP="$(head -1 "$PIDFILE" | tr -d '[:space:]')"
    if ! kill -0 "$SP" 2>/dev/null; then
      rm -f "$PIDFILE"
    fi
  fi
  nohup node "$ROOT/quilax-backend/scripts/keep-pg-5433.mjs" >>"$LOG_DIR/pg-5433.log" 2>&1 &
  echo $! >"$PID_DIR/pg-keeper.pid"
  for i in $(seq 1 60); do
    tcp_up 5433 && break
    if ! is_alive "$PID_DIR/pg-keeper.pid"; then
      echo "❌ Postgres keeper murió — ver $LOG_DIR/pg-5433.log"
      exit 1
    fi
    sleep 1
  done
  if ! tcp_up 5433; then
    echo "❌ Postgres no acepta conexiones en :5433"
    exit 1
  fi
  echo "✓ Postgres :5433 (keeper pid $(cat "$PID_DIR/pg-keeper.pid"))"
fi

# --- Redis :6379 ---
if tcp_up 6379; then
  echo "✓ Redis ya en :6379"
else
  echo "▶ Redis :6379…"
  if [[ ! -x "$REDIS_BIN/redis-server" ]]; then
    echo "❌ No hay redis-server en $REDIS_BIN"
    exit 1
  fi
  nohup "$REDIS_BIN/redis-server" --port 6379 --daemonize no >>"$LOG_DIR/redis.log" 2>&1 &
  echo $! >"$PID_DIR/redis.pid"
  for i in $(seq 1 30); do
    tcp_up 6379 && break
    sleep 1
  done
  if ! tcp_up 6379; then
    echo "❌ Redis no arrancó — ver $LOG_DIR/redis.log"
    exit 1
  fi
  echo "✓ Redis :6379"
fi

# --- Prisma migrate ---
if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  echo ">> Migraciones Prisma..."
  set +e
  (
    cd "$ROOT/quilax-backend"
    npx prisma migrate deploy >/dev/null 2>&1
  )
  mig_rc=$?
  set -e
  if [[ $mig_rc -eq 0 ]]; then
    echo "OK migrate"
  else
    echo "WARN migrate failed/timeout — continuing (use SKIP_MIGRATE=1 to skip)"
  fi
else
  echo "SKIP_MIGRATE=1"
fi

# --- API :3001 ---
if http_ok "http://127.0.0.1:${PORT}/health"; then
  echo "✓ API ya en :${PORT}"
else
  echo "▶ API :${PORT}…"
  # Liberar solo el puerto API (no matar keep-pg)
  for p in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
    kill -9 "$p" 2>/dev/null || true
  done
  sleep 1
  nohup bash "$ROOT/.local-services/start-api.sh" >>"$LOG_DIR/api-launcher.log" 2>&1 &
  echo $! >"$PID_DIR/api-launcher.pid"
  for i in $(seq 1 50); do
    http_ok "http://127.0.0.1:${PORT}/health" && break
    sleep 1
  done
  if ! http_ok "http://127.0.0.1:${PORT}/health"; then
    echo "❌ API no responde — ver $LOG_DIR/api-3001.log"
    exit 1
  fi
  echo "✓ API http://127.0.0.1:${PORT}"
fi

# Watchdog ligero (idempotente)
if ! is_alive "$PID_DIR/api-watchdog.pid"; then
  nohup bash "$ROOT/scripts/dev-api-watchdog.sh" >>"$LOG_DIR/api-watchdog.out" 2>&1 &
  echo $! >"$PID_DIR/api-watchdog.pid"
  echo "✓ API watchdog"
fi

# --- Expo :8081 ---
if [[ "${SKIP_EXPO:-0}" == "1" ]]; then
  echo "⏭ SKIP_EXPO=1"
else
  if http_ok "http://127.0.0.1:8081/"; then
    echo "✓ Expo ya en :8081"
  else
    echo "▶ Expo web :8081…"
    for p in $(lsof -tiTCP:8081 -sTCP:LISTEN 2>/dev/null || true); do
      kill -9 "$p" 2>/dev/null || true
    done
    sleep 1
    (
      cd "$ROOT/quilax-frontend"
      nohup env CI=1 EXPO_NO_TELEMETRY=1 \
        EXPO_PUBLIC_API_PROXY_TARGET="http://127.0.0.1:${PORT}" \
        NODE_OPTIONS='--max-old-space-size=512' \
        ./node_modules/.bin/expo start --web --port 8081 --host localhost \
        >>"$LOG_DIR/expo-8081.log" 2>&1 &
      echo $! >"$PID_DIR/expo.pid"
    )
    for i in $(seq 1 90); do
      http_ok "http://127.0.0.1:8081/" && break
      sleep 2
    done
    if http_ok "http://127.0.0.1:8081/"; then
      echo "✓ Expo http://127.0.0.1:8081"
    else
      echo "⚠ Expo aún arrancando — ver $LOG_DIR/expo-8081.log"
    fi
  fi
fi

echo ""
echo "Listo."
echo "  Frontend  http://127.0.0.1:8081"
echo "  API       http://127.0.0.1:${PORT}/health"
echo "  Postgres  127.0.0.1:5433"
echo "  Redis     127.0.0.1:6379"
echo ""
echo "Logs: $LOG_DIR/"
echo "Parar API:  kill \$(lsof -tiTCP:${PORT} -sTCP:LISTEN)"
echo "Parar PG:   kill \$(cat $PID_DIR/pg-keeper.pid)  # si lo arrancó este script"
