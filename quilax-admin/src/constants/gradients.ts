import { Colors } from '@/constants/theme';

/**
 * Brand gradient — same as public app (more red on the right).
 */
export const APP_GRADIENT = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.gradientEnd,
  '#DC2626',
] as const;

export const APP_GRADIENT_LOCATIONS = [0, 0.28, 0.55, 1] as const;

export const APP_GRADIENT_SOFT = ['#EFF6FF', '#F5F3FF', '#FEE2E2', '#FEF2F2'] as const;

export const SCREEN_BACKGROUND = Colors.light.background;

export const SECTION_ACCENTS = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.purple,
  Colors.light.pink,
] as const;

export const RANKING_MEDALS = [
  ['#F59E0B', '#FBBF24'],
  ['#94A3B8', '#CBD5E1'],
  ['#D97706', '#FCD34D'],
] as const;

export const GRADIENT_DIAGONAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export const GRADIENT_VERTICAL = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

export const GRADIENT_HORIZONTAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
} as const;

export const brandGradientProps = {
  colors: [...APP_GRADIENT] as string[],
  locations: [...APP_GRADIENT_LOCATIONS] as number[],
  ...GRADIENT_DIAGONAL,
};

/** Palette for distribution slices */
export const SHARE_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#A855F7',
] as const;
