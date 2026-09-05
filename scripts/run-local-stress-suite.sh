#!/usr/bin/env bash
# Run full local test suite (E2E + stress). Requires dev-up.sh working first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="$ROOT/.local-services/node/bin:$PATH"
API="${API_BASE:-http://127.0.0.1:3001}"

echo "==> Checking local API at $API"
curl -sf "$API/health" >/dev/null || {
  echo "ERROR: Local backend not running. Fix infra first:"
  echo "  1. bash scripts/dev-up.sh"
  echo "  2. cd quilax-backend && npx prisma migrate deploy"
  echo "  3. node scripts/refresh-demo-data.mjs"
  exit 1
}

cd "$ROOT/quilax-backend"

echo "==> E2E full platform"
node scripts/e2e-full-platform.mjs

echo "==> Stress massive (25k users default)"
USERS=25000 JOINERS=15000 CONCURRENCY=800 ANSWERS=8000 node scripts/stress-massive.mjs

echo "==> Stress triple 100k (reduced if machine struggles: PLAYERS=10000)"
PLAYERS=10000 JOIN_CONCURRENCY=150 NAV_CONCURRENCY=150 node scripts/stress-triple-100k.mjs

echo "==> Jest economy stress"
NODE_ENV=test npm test -- tests/economy.stress.test.js --forceExit

echo "OK — reports in quilax-backend/scripts/*.json"
