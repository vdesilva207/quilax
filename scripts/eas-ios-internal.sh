#!/usr/bin/env bash
# Build iOS interno / TestFlight via EAS.
# Uso:
#   ./scripts/eas-ios-internal.sh preview     # Ad-hoc / internal (testers por link)
#   ./scripts/eas-ios-internal.sh testflight  # Store build → luego eas submit
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FE="$ROOT/quilax-frontend"
PROFILE="${1:-preview}"
NODE_BIN="$ROOT/.local-services/node/bin"
export PATH="$NODE_BIN:$PATH"

if [[ "$PROFILE" != "preview" && "$PROFILE" != "testflight" && "$PROFILE" != "production" ]]; then
  echo "Perfil inválido: $PROFILE (usa preview | testflight | production)"
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
echo "▶ Build iOS profile=$PROFILE"
echo "  (no interrumpe Stripe/Gestión — apunta a api.appquilax.com)"
echo ""

npx eas-cli@latest build --profile "$PROFILE" --platform ios --non-interactive

if [[ "$PROFILE" == "testflight" ]]; then
  echo ""
  echo "Build encolado. Cuando termine:"
  echo "  cd quilax-frontend && npx eas-cli@latest submit --platform ios --profile testflight --latest"
  echo ""
  echo "Antes: sustituye ascAppId en eas.json (App Store Connect → App → App Information → Apple ID)."
fi
