/**
 * Quilax Admin Theme — alineado con la app pública (warm white + Sora).
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1917',
    background: '#FFFCF8',
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
    border: 'rgba(28, 25, 23, 0.06)',
    shadow: '0 4px 24px rgba(28, 25, 23, 0.08)',
    shadowBrand: '0 6px 24px rgba(239, 68, 68, 0.22), 0 2px 12px rgba(59, 130, 246, 0.12)',
  },
  dark: {
    text: '#ffffff',
    background: '#0C0A09',
    backgroundElement: '#1C1917',
    backgroundSelected: '#292524',
    textSecondary: '#A8A29E',
    gradientStart: '#3B82F6',
    gradientMiddle: '#8B5CF6',
    gradientEnd: '#EF4444',
    red: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    primary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    border: 'rgba(255,255,255,0.08)',
    shadow: '0 4px 24px rgba(0,0,0,0.35)',
    shadowBrand: '0 6px 24px rgba(239, 68, 68, 0.28)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Plain string stacks only — react-native-web crashes if fontFamily is an
 * object / CSS var that doesn't stringify cleanly (`value.indexOf is not a function`).
 */
export const Fonts = Platform.select({
  web: {
    sans: "Sora, system-ui, sans-serif",
    serif: 'Georgia, "Times New Roman", serif',
    rounded: "Sora, system-ui, sans-serif",
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'Menlo',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
})!;

export const FONT_DISPLAY = Fonts.sans;

export const titleTypeface = {
  fontFamily: FONT_DISPLAY,
} satisfies TextStyle;

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
