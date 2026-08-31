#!/usr/bin/env bash
# Arranca Postgres, Redis, backend y frontend Expo web con datos de prueba.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$ROOT/.local-services"
CELLAR="$BASE/cellar"
PGROOT="$CELLAR/postgresql@15/15.7"
PG="$PGROOT/bin"
PGDATA="$BASE/pgdata"
REDIS="$CELLAR/redis/7.2.5"
NODE_BIN="$BASE/node/bin"
FAKE="/tmp/qlxhb"
PREFIX="/tmp/quilax-hbrewpx"
HB_CELLAR="/tmp/quilax-cellar1"

export LC_ALL=C
export LANG=C
export PATH="$NODE_BIN:$PG:$REDIS/bin:$PATH"
export DEV_LIGHT_WORKERS=true

restore_symlinks() {
  mkdir -p "$FAKE/opt" "$FAKE/Cellar/postgresql@15" "$PREFIX/opt"
  ln -sfn "$CELLAR" "$HB_CELLAR"
  ln -sfn "$PGROOT" "$FAKE/opt/postgresql@15"
  ln -sfn "$PGROOT" "$FAKE/Cellar/postgresql@15/15.7"
  for d in "$CELLAR"/*; do
    [ -d "$d" ] || continue
    pkg=$(basename "$d")
    verdir=$(ls -1d "$d"/*/ 2>/dev/null | tail -1 || true)
    [ -n "${verdir:-}" ] && ln -sfn "${verdir%/}" "$FAKE/opt/$pkg"
    [ -n "${verdir:-}" ] && ln -sfn "${verdir%/}" "$PREFIX/opt/$pkg"
  done
  ln -sfn "$CELLAR/openssl@3/3.3.0" "$FAKE/opt/openssl"
  ln -sfn "$CELLAR/openssl@3/3.3.0" "$PREFIX/opt/openssl"
}

export DYLD_FALLBACK_LIBRARY_PATH="/tmp:$HB_CELLAR/openssl@3/3.3.0/lib:$FAKE/opt/zstd/lib:$FAKE/opt/gettext/lib:$FAKE/opt/openssl@3/lib:$FAKE/opt/lz4/lib:$FAKE/opt/icu4c@74/lib:$FAKE/opt/krb5/lib:$PGROOT/lib"
export DYLD_LIBRARY_PATH="$DYLD_FALLBACK_LIBRARY_PATH"

restore_symlinks

# Postgres
if ! "$PG/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    echo "ERROR: falta $PGDATA (cluster Postgres)"
    exit 1
  fi
  "$PG/pg_ctl" -D "$PGDATA" -l "$BASE/postgres.log" start || true
  for i in $(seq 1 30); do
    "$PG/pg_isready" -h 127.0.0.1 -p 5432 >/dev/null 2>&1 && break
    sleep 1
  done
fi
"$PG/pg_isready" -h 127.0.0.1 -p 5432

# Redis (prefer fresh dir if RDB version conflicts)
REDIS_DIR="$BASE/redis-data-fresh"
[ -d "$REDIS_DIR" ] || REDIS_DIR="$BASE/redis-data"
mkdir -p "$REDIS_DIR"
if ! "$REDIS/bin/redis-cli" ping >/dev/null 2>&1; then
  "$REDIS/bin/redis-server" \
    --daemonize yes \
    --dir "$REDIS_DIR" \
    --logfile "$BASE/redis.log" \
    --port 6379 || true
  for i in $(seq 1 20); do
    "$REDIS/bin/redis-cli" ping >/dev/null 2>&1 && break
    sleep 1
  done
fi
"$REDIS/bin/redis-cli" ping

# Backend
if ! lsof -tiTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  (
    cd "$ROOT/quilax-backend"
    nohup node src/index.js >"$BASE/backend.log" 2>&1 &
    echo $! >"$BASE/backend.pid"
    disown || true
  )
  for i in $(seq 1 60); do
    if curl -s -m 1 -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/ 2>/dev/null | grep -qE '200|404|401'; then
      break
    fi
    sleep 1
  done
fi

# Frontend Expo web
if ! lsof -tiTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  (
    cd "$ROOT/quilax-frontend"
    # CI=1: Expo has no --non-interactive; without CI it exits when stdin is not a TTY
    export CI=1
    export EXPO_OFFLINE=1
    export EXPO_NO_TELEMETRY=1
    export NODE_OPTIONS="--max-old-space-size=4096"
    # setsid-like: keep alive after parent exits
    nohup npx expo start --web --port 8081 >>"$BASE/frontend.log" 2>&1 &
    echo $! >"$BASE/frontend.pid"
    disown || true
  )
  for i in $(seq 1 120); do
    code=$(curl -s -m 1 -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/ 2>/dev/null || true)
    if [ "$code" = "200" ]; then
      break
    fi
    sleep 1
  done
fi
if ! lsof -tiTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "WARN: frontend no escucha en 8081 (ver $BASE/frontend.log)"
fi

# Demo data: reprogram upcoming quizzes if few live demos
(
  cd "$ROOT/quilax-backend"
  node --input-type=module <<'EOF' || true
import 'dotenv/config';
import prisma from './src/lib/prisma.js';
const now = new Date();
const upcoming = await prisma.quiz.count({
  where: {
    status: { in: ['APPROVED', 'PUBLISHED', 'SCHEDULED'] },
    NOT: { OR: [
      { title: { startsWith: '[T100K' } },
      { title: { startsWith: '[STRESS' } },
      { title: { startsWith: '[ULTRA' } },
    ]},
    schedules: { some: { scheduledAt: { gte: now } } },
  },
});
console.log('upcomingNonStress', upcoming);
await prisma.$disconnect();
process.exit(upcoming >= 20 ? 0 : 2);
EOF
) || {
  echo "Refreshing demo schedules..."
  (cd "$ROOT/quilax-backend" && node scripts/refresh-demo-data.mjs >"$BASE/refresh-demo.log" 2>&1 &) || true
}

echo "OK frontend=http://localhost:8081 backend=http://127.0.0.1:3001"
