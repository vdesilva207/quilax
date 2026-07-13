import { Colors } from '@/constants/theme';

export const APP_GRADIENT = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.gradientEnd,
] as const;

export const APP_GRADIENT_SOFT = ['#EEF2FF', '#F5F3FF', '#FFF1F2'] as const;
export const SCREEN_BACKGROUND = '#F4F6FC';

export const SECTION_ACCENTS = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.purple,
  Colors.light.pink,
] as const;

export const GRADIENT_VERTICAL = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

export const GRADIENT_HORIZONTAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
} as const;
