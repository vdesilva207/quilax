#!/usr/bin/env bash
# Manual prod ping (cold-start wake + readiness).
# Usage: ./scripts/ping-prod.sh
set -euo pipefail
BASE="${PROD_API_URL:-https://api.appquilax.com}"

ping_one() {
  local path="$1"
  echo "=== $BASE$path ==="
  curl -sS -m 45 -w "\nhttp:%{http_code} t:%{time_total}\n" "$BASE$path" || true
}

ping_one /health
ping_one /health/db
ping_one /health/ready
