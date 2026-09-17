#!/usr/bin/env bash
# Build Android via EAS (internal APK or Play Store AAB).
# Uso:
#   ./scripts/eas-android.sh preview   # APK interno (link Expo / sideload)
#   ./scripts/eas-android.sh play      # AAB → Google Play (internal track)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE="$ROOT/quilax-frontend"
PROFILE="${1:-preview}"
NODE_BIN="$ROOT/.local-services/node/bin"
export PATH="$NODE_BIN:$PATH"

if [[ "$PROFILE" != "preview" && "$PROFILE" != "play" && "$PROFILE" != "production" ]]; then
  echo "Perfil inválido: $PROFILE (usa preview | play | production)"
  exit 1
fi

cd "$FE"

echo "▶ EAS whoami…"
if ! npx eas-cli@latest whoami; then
  echo ""
  echo "No hay sesión EAS. Entra con:"
  echo "  cd quilax-frontend && npx eas-cli@latest login"
  exit 1
fi

echo ""
echo "▶ Build Android profile=$PROFILE"
echo "  API: api.appquilax.com"
echo ""

EAS_FLAGS=(--profile "$PROFILE" --platform android)
if [[ "${NONINTERACTIVE:-}" == "1" ]]; then
  EAS_FLAGS+=(--non-interactive)
  echo "  modo: non-interactive"
else
  echo "  modo: interactive (1ª vez: keystore Android en EAS)"
fi

# Prefer local upload (avoids monorepo clone hang); same as iOS path that worked.
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli@latest build "${EAS_FLAGS[@]}"

if [[ "$PROFILE" == "play" || "$PROFILE" == "production" ]]; then
  echo ""
  echo "Build encolado. Cuando termine, submit a Play (internal/draft):"
  echo "  cd quilax-frontend && npx eas-cli@latest submit --platform android --profile play --latest"
  echo ""
  echo "Antes hace falta en Google Play Console:"
  echo "  1) App creada con package com.quilax.app"
  echo "  2) Cuenta de servicio + JSON en EAS credentials (Android)"
fi
