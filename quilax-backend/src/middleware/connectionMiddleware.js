import { wsPool, dbPool, wsRateLimiter, rateLimiter } from '../utils/connectionPool.js';
import { rateLimit } from 'express-rate-limit';
import WebSocket from 'ws';

const httpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded for critical endpoint.',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export function rateLimitMiddleware(req, res, next) {
  const key = req.ip;
  
  if (!rateLimiter.isAllowed(key)) {
    const resetTime = Math.ceil(rateLimiter.getResetTime(key) / 1000);
    const remaining = rateLimiter.getRemainingRequests(key);
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: resetTime,
      remaining
    });
  }
  
  res.set({
    'X-RateLimit-Limit': rateLimiter.maxRequests,
    'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(key),
    'X-RateLimit-Reset': Math.ceil(rateLimiter.getResetTime(key) / 1000)
  });
  
  next();
}

export function wsRateLimitMiddleware(ws, req, next) {
  const key = req.ip || req.connection.remoteAddress;
  
  if (!wsRateLimiter.isAllowed(key)) {
    const resetTime = Math.ceil(wsRateLimiter.getResetTime(key) / 1000);
    
    ws.close(1008, `Rate limit exceeded. Retry after ${resetTime}s`);
    return;
  }
  
  next();
}

export function capacityMiddleware(req, res, next) {
  const currentConnections = wsPool.getStats().active;
  const maxConnections = CONNECTION_POOL_CONFIG.websocket.max;
  
  if (currentConnections >= maxConnections) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Connection pool is full. Please try again later.'
    });
  }
  
  next();
}

export function wsValidationMiddleware(ws, req, next) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return ws.close(1007, 'Invalid WebSocket connection');
  }
  
  if (!req.headers || !req.headers.authorization) {
    return ws.close(1008, 'Missing authentication headers');
  }
  
  if (!wsRateLimiter.isAllowed(req.ip)) {
    return ws.close(1008, 'Rate limit exceeded');
  }
  
  next();
}

export function wsConnectionMiddleware(ws, userId, next) {
  try {
    ws.userId = userId;
    ws.isAlive = true;
    ws.lastPing = Date.now();
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        next(message);
      } catch (error) {
      }
    });
    
    ws.on('close', () => {
      wsPool.release(ws);
      poolMonitor.recordConnection('websocket', false);
    });
    
    ws.on('error', (error) => {
      poolMonitor.recordError('websocket');
    });
    
    next();
  } catch (error) {
    ws.close(1000, 'Internal server error');
  }
}

export function withDatabasePool(handler) {
  return async (req, res, next) => {
    try {
      const client = await dbPool.acquire();
      if (!client) {
        return res.status(503).json({
          error: 'Service unavailable',
          message: 'Database pool is full. Please try again later.'
        });
      }
      
      req.dbClient = client;
      
      const originalNext = next;
      next = async (error) => {
        try {
          await dbPool.release(client);
        } catch (releaseError) {
        }
        
        return originalNext(error);
      };
      
      return handler(req, res, next);
    } catch (error) {
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Database connection error'
      });
    }
  };
}

export function strictRateLimitMiddleware(req, res, next) {
  const key = req.ip;
  
  if (!rateLimiter.isAllowed(key)) {
    const resetTime = Math.ceil(rateLimiter.getResetTime(key) / 1000);
    const remaining = rateLimiter.getRemainingRequests(key);
    
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: resetTime,
      remaining
    });
  }
  
  res.set({
    'X-RateLimit-Limit': rateLimiter.maxRequests,
    'X-RateLimit-Remaining': rateLimiter.getRemainingRequests(key),
    'X-RateLimit-Reset': Math.ceil(rateLimiter.getResetTime(key) / 1000)
  });
  
  next();
}

export { httpRateLimit, strictRateLimit };
