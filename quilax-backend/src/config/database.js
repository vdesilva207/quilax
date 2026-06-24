/**
 * 🗄️ CONFIGURACIÓN DE BASE DE DATOS OPTIMIZADA PARA 2M USUARIOS
 */

import { PrismaClient } from '@prisma/client';

// Configuración optimizada para alta concurrencia
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: ['error', 'warn'],
  errorFormat: 'pretty'
});

// Pool de conexiones escalable - OPTIMIZADO PARA 2M+ USUARIOS
const databaseConfig = {
  // Configuración para PostgreSQL - AUMENTADA
  connectionLimit: 50000,        // 50K conexiones simultáneas (aumentado 5x)
  queueLimit: 200000,             // 200K en cola (aumentado 4x)
  acquireTimeout: 30000,         // 30 segundos timeout (reducido)
  idleTimeout: 60000,            // 1 minuto idle (reducido)
  reapInterval: 500,             // 0.5 segundo cleanup (reducido)
  createRetryInterval: 100,      // 100ms retry (reducido)
  
  // Configuración para Prisma - OPTIMIZADA
  transactionTimeout: 15000,     // 15 segundos por transacción (reducido)
  queryTimeout: 5000,            // 5 segundos por query (reducido)
  
  // Optimizaciones para carga masiva - MEJORADAS
  batch_size: 2000,              // 2K registros por batch (aumentado)
  max_connections: 50000,        // Máximo 50K conexiones (aumentado 5x)
  min_connections: 1000,         // Mínimo 1K conexiones (aumentado 10x)
  
  // Cache de queries - EXPANDIDO
  query_cache_size: 50000,       // 50K queries cacheadas (aumentado 5x)
  prepared_statement_cache: 5000 // 5K prepared statements (aumentado 5x)
};

// Conexión con retry automático
const connectWithRetry = async (maxRetries = 5) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      console.log('🟢 Database connected successfully');
      return prisma;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1}/${maxRetries}:`, error.message);
      
      if (i === maxRetries - 1) {
        throw new Error('Failed to connect to database after multiple attempts');
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Health check de base de datos
const checkDatabaseHealth = async () => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Batch operations para operaciones masivas
const batchOperations = {
  // Insert masivo optimizado
  async batchInsert(model, data, batchSize = 1000) {
    const results = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      try {
        const result = await prisma[model].createMany({
          data: batch,
          skipDuplicates: true
        });
        results.push(result);
      } catch (error) {
        console.error(`❌ Batch insert error at index ${i}:`, error);
        throw error;
      }
    }
    
    return results;
  },
  
  // Update masivo optimizado
  async batchUpdate(model, updates, batchSize = 1000) {
    const results = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      try {
        const result = await Promise.all(
          batch.map(update => 
            prisma[model].update({
              where: update.where,
              data: update.data
            })
          )
        );
        results.push(...result);
      } catch (error) {
        console.error(`❌ Batch update error at index ${i}:`, error);
        throw error;
      }
    }
    
    return results;
  },
  
  // Query masivo optimizado
  async batchQuery(model, queries, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      
      try {
        const result = await Promise.all(
          batch.map(query => 
            prisma[model].findMany(query)
          )
        );
        results.push(...result);
      } catch (error) {
        console.error(`❌ Batch query error at index ${i}:`, error);
        throw error;
      }
    }
    
    return results;
  }
};

// Monitor de conexiones
const connectionMonitor = {
  activeConnections: 0,
  maxConnections: databaseConfig.max_connections,
  
  increment() {
    this.activeConnections++;
    if (this.activeConnections > this.maxConnections) {
      console.warn(`⚠️ Connection limit exceeded: ${this.activeConnections}/${this.maxConnections}`);
    }
  },
  
  decrement() {
    this.activeConnections--;
  },
  
  getStatus() {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      utilization: `${((this.activeConnections / this.maxConnections) * 100).toFixed(2)}%`
    };
  }
};

// Middleware para Prisma con monitoreo
const prismaMiddleware = async (params, next) => {
  const start = Date.now();
  connectionMonitor.increment();
  
  try {
    const result = await next(params);
    const duration = Date.now() - start;
    
    // Log queries lentas (> 1 segundo)
    if (duration > 1000) {
      console.warn(`⚠️ Slow query detected: ${params.model}.${params.action} (${duration}ms)`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Database error: ${params.model}.${params.action}:`, error.message);
    throw error;
  } finally {
    connectionMonitor.decrement();
  }
};

// Aplicar middleware si está disponible
if (typeof prisma.$use === 'function') {
  prisma.$use(prismaMiddleware);
}

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🔄 Closing database connections...');
  try {
    await prisma.$disconnect();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Event listeners
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

export {
  prisma,
  databaseConfig,
  connectWithRetry,
  checkDatabaseHealth,
  batchOperations,
  connectionMonitor,
  gracefulShutdown
};
