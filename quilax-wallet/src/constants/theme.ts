/**
 * Quilax Wallet — light web money surface.
 * Same display face as the main app: Sora.
 */

/** Aligned with quilax-website/css/styles.css + quilax-frontend theme. */
export const Colors = {
  text: '#1C1917',
  textSecondary: '#57534E',
  background: '#FFFCF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F3EEE8',
  primary: '#3B82F6',
  purple: '#8B5CF6',
  red: '#EF4444',
  redDark: '#DC2626',
  success: '#16A34A',
  error: '#EF4444',
  white: '#FFFFFF',
} as const;

export const APP_GRADIENT = ['#3B82F6', '#8B5CF6', '#EF4444', '#DC2626'] as const;
export const APP_GRADIENT_LOCATIONS = [0, 0.28, 0.55, 1] as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Same brand face as quilax-frontend (`--font-display` / Sora). */
export const Fonts = {
  display: "'Sora', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
  body: "'Sora', 'Segoe UI', ui-sans-serif, system-ui, sans-serif",
} as const;

export const MaxWidth = 430;
