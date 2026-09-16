/**
 * Quilax Theme — light-only, mobile-first.
 * Tokens match quilax-website/css/styles.css (warm white, Sora, blue→purple→red).
 */

import '@/globalCss';

import { Platform, type TextStyle } from 'react-native';
import { Typography } from '@/constants/typography';
import { sora } from '@/lib/soraFonts';

export const Colors = {
  light: {
    text: '#1C1917',
    background: '#FFFCF8', // warm white
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F3EEE8',
    textSecondary: '#57534E',
    gradientStart: '#3B82F6',
    gradientMiddle: '#8B5CF6',
    gradientEnd: '#EF4444',
    red: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    primary: '#3B82F6',
    success: '#16A34A',
    warning: '#D97706',
    error: '#EF4444',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

/**
 * Brand typeface — Sora (loaded via expo-font / @expo-google-fonts/sora on native;
 * Google Fonts CSS on web).
 * Native faces omit fontWeight — see `sora()` / resolveSoraStyle.
 */
export const Fonts = Platform.select({
  web: {
    sans: 'Sora, system-ui, sans-serif',
    serif: 'Georgia, serif',
    rounded: 'Sora, system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
  },
  default: {
    sans: 'Sora_500Medium',
    serif: 'Sora_500Medium',
    rounded: 'Sora_500Medium',
    mono: 'Sora_500Medium',
  },
})!;

/** Alias — one face for all titles */
export const FONT_DISPLAY = Platform.select({
  web: 'Sora, system-ui, sans-serif',
  default: 'Sora_700Bold',
})!;

/** Shared title typeface (size stays local to each screen). */
export const titleTypeface = sora(700) satisfies TextStyle;

/** Default body text style — slightly heavier than system regular */
export const bodyTypeface = sora(500) satisfies TextStyle;

export { Typography, sora };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const;

/**
 * @deprecated Prefer useChromeInsets().bottomPadding — fixed 50/80 ignores real devices.
 * Kept as a last-resort fallback for non-hook contexts.
 */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 480;
