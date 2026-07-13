import { rateLimit } from 'express-rate-limit';

const isLocalRequest = (req) => {
  const ip = req.ip || req.socket?.remoteAddress || '';
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.endsWith('127.0.0.1')
  );
};

const shouldSkipRateLimit = (req) => {
  if (isLocalRequest(req)) return true;
  if (process.env.NODE_ENV === 'development') return true;
  return req.user?.role === 'ADMIN';
};

// Configuración de rate limiting distribuido para 2M usuarios
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minuto
    max: 1000, // 1000 requests por minuto por IP
    standardHeaders: true,
    legacyHeaders: false,
    skip: shouldSkipRateLimit,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Por favor, espera un momento antes de hacer más requests',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  };

  return rateLimit({ ...defaultOptions, ...options });
};

// Rate limiters específicos por endpoint
const rateLimiters = {
  // Auth endpoints - más restrictivo
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos por 15 minutos
    message: 'Demasiados intentos de autenticación. Por favor, espera 15 minutos.',
  }),

  // Login - muy restrictivo
  login: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // 3 intentos por 15 minutos
    message: 'Demasiados intentos de login. Por favor, espera 15 minutos.',
  }),

  // Quiz creation - moderado
  quizCreation: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // 10 quizzes por hora
    message: 'Has alcanzado el límite de creación de quizzes. Por favor, espera 1 hora.',
  }),

  // Quiz participation - más permisivo
  quizParticipation: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 100 participaciones por minuto
    message: 'Demasiadas participaciones en quizzes. Por favor, espera un momento.',
  }),

  // Messages - moderado
  messages: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    max: 50, // 50 mensajes por minuto
    message: 'Demasiados mensajes enviados. Por favor, espera un momento.',
  }),

  // Support tickets - restrictivo
  supportTickets: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 5, // 5 tickets por hora
    message: 'Has alcanzado el límite de tickets de soporte. Por favor, espera 1 hora.',
  }),

  // General API - permisivo
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    max: 1000, // 1000 requests por minuto
    message: 'Demasiadas requests. Por favor, espera un momento.',
  }),

  // Read operations - muy permisivo
  read: createRateLimiter({
    windowMs: 60 * 1000, // 1 minuto
    max: 5000, // 5000 reads por minuto
    message: 'Demasiadas operaciones de lectura. Por favor, espera un momento.',
  }),

  // Sensitive operations - muy restrictivo (password reset, etc)
  sensitive: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // 3 intentos por hora
    message: 'Demasiados intentos. Por favor, contacta al soporte si necesitas ayuda.',
  }),
};

// Middleware para aplicar rate limiting basado en el tipo de usuario
const adaptiveRateLimiter = (req, res, next) => {
  const user = req.user;
  
  // Usuarios premium tienen límites más altos
  if (user?.premium) {
    req.rateLimit = {
      limit: 10000, // 10x más requests
      window: 60 * 1000,
    };
  }
  
  // Usuarios normales tienen límites estándar
  else {
    req.rateLimit = {
      limit: 1000,
      window: 60 * 1000,
    };
  }
  
  next();
};

// Rate limiting basado en IP para prevenir DDoS
const ipRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  max: 10000, // 10K requests por minuto por IP
  message: 'IP bloqueada temporalmente por exceso de requests.',
});

// Rate limiting basado en usuario
const userRateLimiter = (req, res, next) => {
  if (!req.user) {
    return ipRateLimiter(req, res, next);
  }
  
  const userKey = `user:${req.user.id}`;
  const limiter = createRateLimiter({
    keyGenerator: (req) => userKey,
    windowMs: 60 * 1000,
    max: req.user.premium ? 10000 : 1000,
  });
  
  limiter(req, res, next);
};

export {
  createRateLimiter,
  rateLimiters,
  adaptiveRateLimiter,
  ipRateLimiter,
  userRateLimiter,
};
