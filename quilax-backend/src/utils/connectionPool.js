import { createPool } from 'generic-pool';
import WebSocket from 'ws';

const CONNECTION_POOL_CONFIG = {
  websocket: {
    max: 10000,
    min: 100,
    acquireTimeoutMillis: 5000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 1000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
    maxWaitingClients: 1000
  },
  
  database: {
    max: 50,
    min: 5,
    acquireTimeoutMillis: 5000,
    createTimeoutMillis: 3000,
    destroyTimeoutMillis: 1000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200
  }
};

class WebSocketPool {
  constructor() {
    this.connections = new Map();
    this.stats = {
      total: 0,
      active: 0,
      errors: 0
    };
  }

  async acquire() {
    return Promise.resolve(null);
  }

  async release(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  async destroy(ws) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  getStats() {
    return {
      size: this.stats.total,
      available: Math.max(0, this.stats.total - this.stats.active),
      pending: 0,
      max: CONNECTION_POOL_CONFIG.websocket.max,
      min: CONNECTION_POOL_CONFIG.websocket.min
    };
  }

  addConnection() {
    this.stats.total++;
    this.stats.active++;
  }

  removeConnection() {
    this.stats.active = Math.max(0, this.stats.active - 1);
  }

  recordError() {
    this.stats.errors++;
  }
}

class DatabasePool {
  constructor() {
    this.connections = new Map();
    this.stats = {
      total: 0,
      active: 0,
      errors: 0
    };
  }

  async acquire() {
    return Promise.resolve(null);
  }

  async release(client) {
    if (client) {
      try {
        await client.$disconnect();
      } catch (error) {
      // Error releasing DB client
      }
    }
  }

  async destroy(client) {
    if (client) {
      try {
        await client.$disconnect();
      } catch (error) {
      // Error destroying DB client
      }
    }
  }

  getStats() {
    return {
      size: this.stats.total,
      available: Math.max(0, this.stats.total - this.stats.active),
      pending: 0,
      max: CONNECTION_POOL_CONFIG.database.max,
      min: CONNECTION_POOL_CONFIG.database.min
    };
  }

  addConnection() {
    this.stats.total++;
    this.stats.active++;
  }

  removeConnection() {
    this.stats.active = Math.max(0, this.stats.active - 1);
  }

  recordError() {
    this.stats.errors++;
  }
}

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 1000;
    this.requests = new Map();
  }

  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const userRequests = this.requests.get(key);
    const validRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      return this.maxRequests;
    }
    
    const userRequests = this.requests.get(key);
    const validRequests = userRequests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  getResetTime(key) {
    if (!this.requests.has(key)) {
      return 0;
    }
    
    const userRequests = this.requests.get(key);
    if (userRequests.length === 0) {
      return 0;
    }
    
    return userRequests[0] + this.windowMs;
  }
}

export class PoolMonitor {
  constructor() {
    this.stats = {
      wsConnections: 0,
      dbConnections: 0,
      rejectedConnections: 0,
      avgResponseTime: 0,
      errors: 0
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      const wsStats = wsPool.getStats();
      const dbStats = dbPool.getStats();
      
      // Pool monitoring completed
    }, 30000);
  }

  recordConnection(type, success = true) {
    if (type === 'websocket') {
      this.stats.wsConnections++;
      if (success) {
        wsPool.addConnection();
      } else {
        this.stats.rejectedConnections++;
        wsPool.recordError();
      }
    } else if (type === 'database') {
      this.stats.dbConnections++;
      if (success) {
        dbPool.addConnection();
      } else {
        this.stats.rejectedConnections++;
        dbPool.recordError();
      }
    }
  }

  recordError(type) {
    this.stats.errors++;
    if (type === 'websocket') {
      wsPool.recordError();
    } else if (type === 'database') {
      dbPool.recordError();
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

// Instancias globales
export const wsPool = new WebSocketPool();
export const dbPool = new DatabasePool();
export const rateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 100
});

// Rate limiter específico para conexiones WebSocket
export const wsRateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 50
});

export function createRateLimitMiddleware(limiter, keyExtractor = (req) => req.ip) {
  return (req, res, next) => {
    const key = keyExtractor(req);
    
    if (!limiter.isAllowed(key)) {
      const resetTime = Math.ceil(limiter.getResetTime(key) / 1000);
      const remaining = limiter.getRemainingRequests(key);
      
      return res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded',
        retryAfter: resetTime,
        remaining
      });
    }
    
    res.set({
      'X-RateLimit-Limit': limiter.maxRequests,
      'X-RateLimit-Remaining': limiter.getRemainingRequests(key),
      'X-RateLimit-Reset': Math.ceil(limiter.getResetTime(key) / 1000)
    });
    
    next();
  };
}

export const poolMonitor = new PoolMonitor();
