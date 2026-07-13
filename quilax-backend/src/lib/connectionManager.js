import http from 'http';

// Connection pooling y reuse para evitar EMFILE
class ConnectionManager {
  constructor() {
    this.agent = new http.Agent({
      keepAlive: true,
      maxSockets: 1000,
      maxFreeSockets: 100,
      timeout: 30000,
      keepAliveMsecs: 1000,
    });
    
    this.activeConnections = 0;
    this.maxConnections = 10000;
  }

  // Middleware para limitar conexiones concurrentes
  connectionLimiter(limit = 5000) {
    return (req, res, next) => {
      if (this.activeConnections >= limit) {
        return res.status(503).json({ 
          error: 'Server overloaded',
          retryAfter: '1'
        });
      }
      
      this.activeConnections++;
      
      res.on('finish', () => {
        this.activeConnections--;
      });
      
      next();
    };
  }

  // Rate limiting por IP para prevenir abuse
  rateLimiter(options = {}) {
    const { windowMs = 60000, max = 100 } = options;
    const requests = new Map();
    
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(ip)) {
        requests.set(ip, []);
      }
      
      const ipRequests = requests.get(ip);
      
      // Limpiar requests viejas
      const validRequests = ipRequests.filter(time => time > windowStart);
      requests.set(ip, validRequests);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      validRequests.push(now);
      next();
    };
  }

  // Health check de conexiones
  getConnectionStats() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      agentStats: {
        totalSockets: this.agent.totalSocketCount || 0,
        freeSockets: this.agent.freeSockets || 0,
        requests: this.agent.requests || 0
      }
    };
  }
}

export const connectionManager = new ConnectionManager();

// Configuración de Node.js para alta concurrencia
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

// Aumentar límites de event loop
if (process.env.NODE_ENV === 'production') {
  process.setMaxListeners(50);
}
