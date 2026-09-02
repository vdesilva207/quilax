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
  normal: 'Sora_500Medium',
  '500': 'Sora_500Medium',
  '600': 'Sora_600SemiBold',
  '700': 'Sora_700Bold',
  bold: 'Sora_700Bold',
  '800': 'Sora_800ExtraBold',
  '900': 'Sora_800ExtraBold',
};

export type SoraWeight = 500 | 600 | 700 | 800;

const WEB_FAMILY = 'Sora, system-ui, sans-serif';

/** Brand typeface for a given weight — safe on Android/iOS/web. */
export function sora(weight: SoraWeight = 500): TextStyle {
  if (Platform.OS === 'web') {
    return {
      fontFamily: WEB_FAMILY,
      fontWeight: String(weight) as TextStyle['fontWeight'],
    };
  }
  const family =
    weight === 800
      ? 'Sora_800ExtraBold'
      : weight === 700
        ? 'Sora_700Bold'
        : weight === 600
          ? 'Sora_600SemiBold'
          : 'Sora_500Medium';
  return { fontFamily: family };
}

function looksLikeSora(family?: string | null): boolean {
  if (!family) return true; // app default is Sora via Text defaultProps
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

  const weightKey = flat.fontWeight != null ? String(flat.fontWeight) : null;
  const mapped =
    (weightKey && SORA_BY_WEIGHT[weightKey]) ||
    (flat.fontFamily as string | undefined) ||
    'Sora_500Medium';

  // Keep original styles, then force face + neutralize weight for Android.
  return [style, { fontFamily: mapped, fontWeight: 'normal' }];
}
