import rateLimit from 'express-rate-limit';

// Rate limiting para rutas de autenticación (más estricto)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por ventana
  message: {
    error: 'Demasiados intentos de autenticación. Por favor, intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para rutas generales (menos estricto)
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 solicitudes por ventana
  message: {
    error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting para rutas sensibles (muy estricto)
export const sensitiveRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 intentos por ventana
  message: {
    error: 'Demasiados intentos. Por favor, contacta al soporte si necesitas ayuda.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
