import { Platform, StyleSheet, type TextStyle, type StyleProp, type TextStyle as RNTextStyle } from 'react-native';

/**
 * Map CSS-like weights onto loaded @expo-google-fonts/sora faces.
 * On Android, pairing a specific Sora_* family with fontWeight makes RN fall back
 * to the system font — always pick the face and drop fontWeight on native.
 */
const SORA_BY_WEIGHT: Record<string, string> = {
  '100': 'Sora_500Medium',
  '200': 'Sora_500Medium',
  '300': 'Sora_500Medium',
  '400': 'Sora_500Medium',
  '500': 'Sora_500Medium',
  '600': 'Sora_600SemiBold',
  '700': 'Sora_700Bold',
  bold: 'Sora_700Bold',
  '800': 'Sora_800ExtraBold',
  '900': 'Sora_800ExtraBold',
};

export type SoraWeight = 500 | 600 | 700 | 800;

const WEB_FAMILY = 'Sora, system-ui, sans-serif';

function faceForWeight(weight: number | string): string {
  const key = String(weight);
  return SORA_BY_WEIGHT[key] || 'Sora_500Medium';
}

/** Brand typeface for a given weight — safe on Android/iOS/web. */
export function sora(weight: SoraWeight = 500): TextStyle {
  if (Platform.OS === 'web') {
    return {
      fontFamily: WEB_FAMILY,
      fontWeight: String(weight) as TextStyle['fontWeight'],
    };
  }
  // Never set fontWeight: 'normal' — resolveSoraStyle would remap it to Medium
  // and wipe ExtraBold / Bold faces used for QUILAX titles.
  return {
    fontFamily: faceForWeight(weight),
  };
}

function looksLikeSora(family?: string | null): boolean {
  if (!family) return true; // defaultProps apply Sora
  if (family === 'System' || family === 'sans-serif') return true;
  return family.startsWith('Sora') || family.includes('Sora');
}

/**
 * Flatten styles and remap Sora + fontWeight → correct face without weight (native).
 * Safe no-op on web.
 */
export function resolveSoraStyle(style: StyleProp<RNTextStyle>): StyleProp<RNTextStyle> {
  if (Platform.OS === 'web' || style == null) return style;
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!flat) return style;
  if (!looksLikeSora(flat.fontFamily as string | undefined)) return style;

  const existingFamily = flat.fontFamily as string | undefined;
  const weightKey = flat.fontWeight != null ? String(flat.fontWeight) : null;

  // Prefer an explicit loaded face (Sora_700Bold / Sora_800ExtraBold, …).
  // Do NOT treat fontWeight "normal" as Medium — that was making QUILAX look thin.
  let mapped: string;
  if (existingFamily && /^Sora_\d/.test(existingFamily)) {
    mapped = existingFamily;
  } else if (weightKey && weightKey !== 'normal' && SORA_BY_WEIGHT[weightKey]) {
    mapped = SORA_BY_WEIGHT[weightKey];
  } else {
    mapped = existingFamily || 'Sora_500Medium';
  }

  // Force face + kill weight/style that trigger Android system-font substitution.
  return [
    style,
    {
      fontFamily: mapped,
      fontWeight: undefined,
      ...(Platform.OS === 'android'
        ? { includeFontPadding: false, fontStyle: 'normal' as const }
        : null),
    },
  ];
}
