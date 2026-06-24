import Redis from 'ioredis';

// Configuración de Redis para caching y sesiones
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
  lazyConnect: false,
};

// Cliente principal de Redis
const redis = new Redis(redisConfig);

// Cliente para pub/sub (WebSocket)
const redisPub = new Redis(redisConfig);
const redisSub = new Redis(redisConfig);

// Cliente para caching
const redisCache = new Redis({
  ...redisConfig,
  db: 1, // Base de datos separada para cache
});

// Cliente para sesiones
const redisSession = new Redis({
  ...redisConfig,
  db: 2, // Base de datos separada para sesiones
});

// Cliente para rate limiting
const redisRateLimit = new Redis({
  ...redisConfig,
  db: 3, // Base de datos separada para rate limiting
});

// Manejo de errores
redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redisPub.on('error', (err) => {
  console.error('Redis Pub error:', err);
});

redisSub.on('error', (err) => {
  console.error('Redis Sub error:', err);
});

redisCache.on('error', (err) => {
  console.error('Redis Cache error:', err);
});

redisSession.on('error', (err) => {
  console.error('Redis Session error:', err);
});

redisRateLimit.on('error', (err) => {
  console.error('Redis Rate Limit error:', err);
});

// Funciones de cache
const cache = {
  async get(key) {
    try {
      const value = await redisCache.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      await redisCache.set(key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      await redisCache.del(key);
      return true;
    } catch (error) {
      console.error('Cache del error:', error);
      return false;
    }
  },

  async invalidatePattern(pattern) {
    try {
      const keys = await redisCache.keys(pattern);
      if (keys.length > 0) {
        await redisCache.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate pattern error:', error);
      return false;
    }
  },
};

// Funciones de rate limiting
const rateLimit = {
  async check(key, limit, window) {
    try {
      const current = await redisRateLimit.incr(key);
      
      if (current === 1) {
        await redisRateLimit.expire(key, window);
      }
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        reset: Math.ceil(Date.now() / 1000) + window,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, remaining: limit, reset: Math.ceil(Date.now() / 1000) + window };
    }
  },

  async reset(key) {
    try {
      await redisRateLimit.del(key);
      return true;
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return false;
    }
  },
};

export {
  redis,
  redisPub,
  redisSub,
  redisCache,
  redisSession,
  redisRateLimit,
  cache,
  rateLimit,
};
