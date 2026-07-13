/**
 * 🔄 REDIS CLUSTER - CACHE DISTRIBUIDO PARA 2M USUARIOS
 */

import Redis from 'ioredis';

// Configuración del cluster Redis
const redisClusterConfig = {
  nodes: [
    { host: 'redis-node-1', port: 6379 },
    { host: 'redis-node-2', port: 6379 },
    { host: 'redis-node-3', port: 6379 },
    { host: 'redis-node-4', port: 6379 },
    { host: 'redis-node-5', port: 6379 },
    { host: 'redis-node-6', port: 6379 }
  ],
  options: {
    // Opciones de cluster
    enableOfflineQueue: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    
    // Opciones de conexión
    connectTimeout: 10000,
    commandTimeout: 5000,
    
    // Opciones de pool
    family: 4,
    keepAlive: 30000,
    
    // Opciones de retry
    retryDelayOnClusterDown: 300,
    maxRedirections: 16,
    
    // Opciones de scaling
    scaleReads: 'slave',
    redisOptions: {
      db: 0
    }
  }
};

// Cache distribuido con múltiples estrategias
class DistributedCache {
  constructor() {
    this.cluster = null;
    this.fallbackRedis = null;
    this.localCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Intentar conectar al cluster
      this.cluster = new Redis.Cluster(redisClusterConfig.nodes, redisClusterConfig.options);
      
      this.cluster.on('connect', () => {
        console.log('🟢 Redis Cluster connected');
      });
      
      this.cluster.on('error', (error) => {
        console.error('❌ Redis Cluster error:', error);
        this.stats.errors++;
      });
      
      this.cluster.on('node error', (error, node) => {
        console.error(`❌ Redis node ${node.options.host}:${node.options.port} error:`, error);
      });
      
      // Fallback a Redis standalone
      this.fallbackRedis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      
      this.fallbackRedis.on('connect', () => {
        console.log('🟡 Redis fallback connected');
      });
      
      this.fallbackRedis.on('error', (error) => {
        console.error('❌ Redis fallback error:', error);
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
    }
  }

  // Get con fallback chain
  async get(key) {
    try {
      // 1. Intentar local cache primero
      const localValue = this.localCache.get(key);
      if (localValue !== undefined) {
        this.stats.hits++;
        return localValue;
      }
      
      // 2. Intentar Redis cluster
      if (this.cluster && this.cluster.status === 'ready') {
        const value = await this.cluster.get(key);
        if (value !== null) {
          this.stats.hits++;
          this.localCache.set(key, JSON.parse(value));
          return JSON.parse(value);
        }
      }
      
      // 3. Intentar Redis fallback
      if (this.fallbackRedis && this.fallbackRedis.status === 'ready') {
        const value = await this.fallbackRedis.get(key);
        if (value !== null) {
          this.stats.hits++;
          this.localCache.set(key, JSON.parse(value));
          return JSON.parse(value);
        }
      }
      
      this.stats.misses++;
      return null;
      
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  // Set con replicación
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      
      // 1. Local cache
      this.localCache.set(key, value);
      this.stats.sets++;
      
      // 2. Redis cluster
      if (this.cluster && this.cluster.status === 'ready') {
        await this.cluster.setex(key, ttl, serializedValue);
      }
      
      // 3. Redis fallback
      if (this.fallbackRedis && this.fallbackRedis.status === 'ready') {
        await this.fallbackRedis.setex(key, ttl, serializedValue);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  // Delete en todos los niveles
  async del(key) {
    try {
      // 1. Local cache
      this.localCache.delete(key);
      
      // 2. Redis cluster
      if (this.cluster && this.cluster.status === 'ready') {
        await this.cluster.del(key);
      }
      
      // 3. Redis fallback
      if (this.fallbackRedis && this.fallbackRedis.status === 'ready') {
        await this.fallbackRedis.del(key);
      }
      
      return true;
      
    } catch (error) {
      console.error(`❌ Cache del error for key ${key}:`, error);
      return false;
    }
  }

  // Batch operations
  async mget(keys) {
    const results = {};
    
    for (const key of keys) {
      results[key] = await this.get(key);
    }
    
    return results;
  }

  async mset(keyValues, ttl = 3600) {
    const results = {};
    
    for (const [key, value] of Object.entries(keyValues)) {
      results[key] = await this.set(key, value, ttl);
    }
    
    return results;
  }

  // Cache de tokens de autenticación
  async cacheToken(userId, token, ttl = 3600) {
    const key = `auth:token:${userId}`;
    return await this.set(key, { token, userId, timestamp: Date.now() }, ttl);
  }

  async getToken(userId) {
    const key = `auth:token:${userId}`;
    return await this.get(key);
  }

  async removeToken(userId) {
    const key = `auth:token:${userId}`;
    return await this.del(key);
  }

  // Cache de sesiones
  async cacheSession(sessionId, sessionData, ttl = 1800) {
    const key = `session:${sessionId}`;
    return await this.set(key, sessionData, ttl);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  // Cache de quizzes
  async cacheQuiz(quizId, quizData, ttl = 7200) {
    const key = `quiz:${quizId}`;
    return await this.set(key, quizData, ttl);
  }

  async getQuiz(quizId) {
    const key = `quiz:${quizId}`;
    return await this.get(key);
  }

  // Cache de resultados de validación
  async cacheValidationResult(quizHash, result, ttl = 3600) {
    const key = `validation:${quizHash}`;
    return await this.set(key, result, ttl);
  }

  async getValidationResult(quizHash) {
    const key = `validation:${quizHash}`;
    return await this.get(key);
  }

  // Health check
  async getHealthStatus() {
    const status = {
      cluster: 'disconnected',
      fallback: 'disconnected',
      local: 'connected',
      stats: this.stats,
      timestamp: new Date().toISOString()
    };
    
    if (this.cluster) {
      status.cluster = this.cluster.status;
    }
    
    if (this.fallbackRedis) {
      status.fallback = this.fallbackRedis.status;
    }
    
    // Test de rendimiento
    const testKey = 'health:test';
    const testValue = { test: true, timestamp: Date.now() };
    
    const start = Date.now();
    await this.set(testKey, testValue, 10);
    const retrieved = await this.get(testKey);
    const latency = Date.now() - start;
    
    status.performance = {
      latency: `${latency}ms`,
      success: retrieved && retrieved.test === true
    };
    
    await this.del(testKey);
    
    return status;
  }

  // Cleanup de local cache
  cleanup() {
    // Limpiar entradas viejas del local cache
    const maxSize = 10000;
    if (this.localCache.size > maxSize) {
      const entries = Array.from(this.localCache.entries());
      const toDelete = entries.slice(0, this.localCache.size - maxSize);
      
      toDelete.forEach(([key]) => {
        this.localCache.delete(key);
      });
      
      console.log(`🧹 Cleaned ${toDelete.length} entries from local cache`);
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down Redis connections...');
    
    if (this.cluster) {
      await this.cluster.disconnect();
    }
    
    if (this.fallbackRedis) {
      await this.fallbackRedis.disconnect();
    }
    
    console.log('✅ Redis connections closed');
  }

  // Estadísticas
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : '0.00';
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      total,
      localCacheSize: this.localCache.size
    };
  }
}

// Instancia global del cache
const distributedCache = new DistributedCache();

// Cleanup periódico
setInterval(() => {
  distributedCache.cleanup();
}, 60000); // Cada minuto

// Graceful shutdown
process.on('SIGINT', () => distributedCache.shutdown());
process.on('SIGTERM', () => distributedCache.shutdown());

export {
  distributedCache,
  redisClusterConfig
};
