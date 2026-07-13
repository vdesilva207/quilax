// Sistema de tipografía
export const Typography = {
  // Tamaños de fuente
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  
  // Pesos de fuente
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  
  // Familias de fuente
  sans: 'System',
  mono: 'Courier',
};

export const FontSizes = {
  display: Typography['6xl'],
  h1: Typography['4xl'],
  h2: Typography['3xl'],
  h3: Typography['2xl'],
  h4: Typography.xl,
  body: Typography.base,
  caption: Typography.sm,
  small: Typography.xs,
};
