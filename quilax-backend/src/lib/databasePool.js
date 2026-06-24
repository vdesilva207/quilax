import { PrismaClient } from '@prisma/client';

// Configuración optimizada para alta concurrencia
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Optimización del connection pool para alta concurrencia
// Aumentamos el pool size para manejar más conexiones simultáneas
if (process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const poolSize = process.env.DB_POOL_SIZE || '50'; // Aumentado de 20 a 50
  const connectionTimeoutMillis = process.env.DB_CONNECTION_TIMEOUT || '10000';
  const idleTimeoutMillis = process.env.DB_IDLE_TIMEOUT || '30000';
  
  dbUrl.searchParams.set('connection_limit', poolSize);
  dbUrl.searchParams.set('connect_timeout', connectionTimeoutMillis);
  dbUrl.searchParams.set('pool_timeout', idleTimeoutMillis);
  
  process.env.DATABASE_URL = dbUrl.toString();
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Health check para el pool de conexiones
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
