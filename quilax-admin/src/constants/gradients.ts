import { Colors } from '@/constants/theme';

/** Gradiente principal de la marca (azul → morado → rojo) */
export const APP_GRADIENT = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.gradientEnd,
] as const;

/** Gradiente suave para fondos de tarjetas */
export const APP_GRADIENT_SOFT = [
  '#EEF2FF',
  '#F5F3FF',
  '#FFF1F2',
] as const;

/** Fondo general de pantallas — menos blanco corporativo */
export const SCREEN_BACKGROUND = '#F4F6FC';

/** Acentos alternados por sección */
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

/** Gradiente vertical (arriba → abajo) para fondos y tarjetas */
export const GRADIENT_VERTICAL = {
  start: { x: 0, y: 0 },
  end: { x: 0, y: 1 },
} as const;

/** Gradiente horizontal (izquierda → derecha) para botones y CTAs */
export const GRADIENT_HORIZONTAL = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
} as const;
