/**
 * Quilax Theme - Colores basados en el logo (blanco, negro, gradiente azul-morado-rojo)
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F8FAFC',
    backgroundSelected: '#E2E8F0',
    textSecondary: '#64748B',
    // Gradiente del logo (azul - morado - rojo)
    gradientStart: '#3B82F6',
    gradientMiddle: '#8B5CF6',
    gradientEnd: '#EF4444',
    // Colores adicionales (rojo, rosa, morado)
    red: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    primary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    textSecondary: '#94A3B8',
    // Gradiente del logo (azul - morado - rojo)
    gradientStart: '#3B82F6',
    gradientMiddle: '#8B5CF6',
    gradientEnd: '#EF4444',
    // Colores adicionales (rojo, rosa, morado)
    red: '#EF4444',
    pink: '#EC4899',
    purple: '#8B5CF6',
    primary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'Helvetica',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'Helvetica',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'Helvetica',
  },
});

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
