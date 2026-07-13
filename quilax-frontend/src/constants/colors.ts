// Colores Quilax - Basados en el logo
export const Colors = {
  // Colores principales
  white: '#FFFFFF',
  black: '#000000',
  
  // Gradiente del logo (azul - morado - rojo)
  gradientStart: '#3B82F6',   // Azul
  gradientMiddle: '#8B5CF6',  // Morado
  gradientEnd: '#EF4444',     // Rojo
  
  // Colores derivados del gradiente
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Colores secundarios (grises)
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  // Colores de semántica
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Colores de gamificación
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
  },
  
  silver: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
  },
  
  bronze: {
    50: '#FEF7EE',
    100: '#FDECD9',
    200: '#FBD9A5',
    300: '#F8C26D',
    400: '#F5A623',
    500: '#D97706',
  },
};

export const Gradients = {
  primary: [Colors.gradientStart, Colors.gradientMiddle, Colors.gradientEnd],
  primaryReverse: [Colors.gradientEnd, Colors.gradientMiddle, Colors.gradientStart],
  bluePurple: [Colors.gradientStart, Colors.gradientMiddle],
  purpleRed: [Colors.gradientMiddle, Colors.gradientEnd],
};
