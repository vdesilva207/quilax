#!/usr/bin/env bash
# Arranca Postgres embebido + API local + Expo web para desarrollo sin Render.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$ROOT/.local-services/node/bin"
export PATH="$NODE:$PATH"

LOCAL_DB_URL="postgresql://quilax:quilax@127.0.0.1:5432/quilax_dev"

echo "▶ Postgres embebido..."
if ! lsof -tiTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
  cd "$ROOT/quilax-backend"
  node scripts/start-local-db.mjs &
  PG_PID=$!
  for i in $(seq 1 60); do
    if lsof -tiTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then break; fi
    sleep 1
  done
  if ! lsof -tiTCP:5432 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "❌ Postgres no arrancó"; exit 1
  fi
  echo "✓ Postgres :5432 (pid $PG_PID)"
else
  echo "✓ Postgres ya en :5432"
fi

echo "▶ Migraciones Prisma..."
cd "$ROOT/quilax-backend"
DATABASE_URL="$LOCAL_DB_URL" npx prisma migrate deploy

echo "▶ API :3001..."
if lsof -tiTCP:3001 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ API ya en :3001"
else
  cd "$ROOT/quilax-backend"
  DATABASE_URL="$LOCAL_DB_URL" PORT=3001 NODE_ENV=development DEV_LIGHT_WORKERS=true node src/index.js &
  API_PID=$!
  for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:3001/health >/dev/null 2>&1; then break; fi
    sleep 1
  done
  echo "✓ API http://127.0.0.1:3001 (pid ${API_PID:-?})"
fi

echo "▶ Expo web :8081..."
if lsof -tiTCP:8081 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✓ Expo ya en :8081"
else
  cd "$ROOT/quilax-frontend"
  EXPO_PUBLIC_API_PROXY_TARGET=http://127.0.0.1:3001 npx expo start --web --port 8081 --host localhost &
  echo "✓ Expo arrancando → http://127.0.0.1:8081"
fi

echo ""
echo "Listo. Frontend: http://127.0.0.1:8081  |  API: http://127.0.0.1:3001"
