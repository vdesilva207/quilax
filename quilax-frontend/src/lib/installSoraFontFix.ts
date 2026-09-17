/**
 * Was: monkey-patch RN.Text / TextInput to remap Sora fontWeight.
 * On React Native 0.81+, those exports are getter-only — assignment throws
 * TypeError during module init and leaves TestFlight stuck on the native splash
 * before expo-router ever mounts.
 *
 * Font remapping is handled by `sora()` / `resolveSoraStyle` + Text defaultProps
 * in `src/app/_layout.tsx` instead. This file is intentionally a no-op.
 */
export function installSoraFontFix() {
  /* no-op — see file comment */
}
