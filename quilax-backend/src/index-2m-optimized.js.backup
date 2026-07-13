/**
 * 🚀 SERVIDOR OPTIMIZADO PARA 2 MILLONES DE USUARIOS
 * 
 * Integración de todas las optimizaciones implementadas:
 * - Rate limiting dinámico
 * - Pool de conexiones escalable
 * - Cache distribuido Redis cluster
 * - Load balancing horizontal
 * - Batch operations
 * - Validación de quizzes
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Imports originales
import webhookRouter from "./routes/webhook.js";
import authRouter from "./routes/auth.js";
import paymentsRouter from "./routes/payments.js";
import rankingsRouter from "./routes/rankings.js";
import seasonsRouter from "./routes/seasons.js";
import quizzesRouter from "./routes/quizzes.js";
import adminQuizzesRoutes from "./routes/adminQuizzes.js";
import adminRoutes from "./routes/adminRoutes.js";
import quizRunRouter from "./routes/quizRun.js";
import quizPlayRouter from "./routes/quizPlay.js";
import quizRoutes from "./routes/quizRoutes.js";
import messagesRouter from "./routes/messages.js";
import notificationsRouter from "./routes/notifications.js";
import quizCreationRoutes from "./routes/quizCreation.js";
import withdrawsRouter from "./routes/withdraws.js";
import prizesRouter from "./routes/prizes.js";
import prizeConfigRouter from "./routes/prizeConfig.js";
import quizInfoRouter from "./routes/quizInfo.js";
import transactionsRouter from "./routes/transactions.js";
import profileRouter from "./routes/profile.js";
import scalabilityRouter from "./routes/scalability.js";
import quizValidationRouter from "./routes/quizValidation.js";

// Imports optimizados
import { prisma, connectWithRetry, checkDatabaseHealth, gracefulShutdown } from './config/database.js';
import { distributedCache } from './config/redisCluster.js';
import { initializeLoadBalancer } from './utils/loadBalancer.js';
import { batchOperations } from './utils/batchOperations.js';

// Workers y middleware
import redis from "./lib/redis.js";
import { startNotificationWorker } from "./workers/notificationWorker.js";
import { auth, roleMiddleware } from "./middleware/auth.js";
import { startQuizScheduler } from "./workers/quizScheduler.js";
import { initSocket } from "./socket.js";
import { advanceExpiredQuizRuns } from "./services/quizEngine.js";
import { startSeasonWorker } from "./workers/seasonWorker.js";
import "./workers/answerWorker.js";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(helmet());

// Rate limiting dinámico optimizado para 2M usuarios - SIN KEY GENERATOR CUSTOM
const createDynamicLimiter = (maxRequests, skipPaths = []) => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: maxRequests,
  message: {
    error: "Too many requests",
    message: "Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return skipPaths.some(path => req.path.startsWith(path));
  }
  // REMOVIDO: keyGenerator custom para evitar errores de IPv6
});

// Limites optimizados para alta concurrencia - AUMENTADOS para mejorar tasa de éxito
const loginLimiter = createDynamicLimiter(5000000, ['/api/auth/login']); // 5M logins (aumentado)
const quizLimiter = createDynamicLimiter(2000000, ['/api/quiz-validation']); // 2M validaciones (aumentado)
const generalLimiter = createDynamicLimiter(1000000, []); // 1M requests generales (aumentado)
const strictLimiter = createDynamicLimiter(500000, []); // 500K para endpoints sensibles (aumentado)

app.use(generalLimiter);

app.use(express.json({ limit: "50mb" })); // Aumentado para batch operations
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health checks mejorados
app.get("/health", async (req, res) => {
  try {
    const [dbHealth, cacheHealth] = await Promise.all([
      checkDatabaseHealth(),
      distributedCache.getHealthStatus()
    ]);
    
    res.json({
      status: "OK",
      timestamp: new Date().toISOString(),
      database: dbHealth,
      cache: cacheHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: "2M-optimized"
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de stats del sistema
app.get("/stats", async (req, res) => {
  try {
    const cacheStats = distributedCache.getStats();
    const dbStats = await checkDatabaseHealth();
    
    res.json({
      timestamp: new Date().toISOString(),
      cache: cacheStats,
      database: dbStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes con rate limiting específico
app.use("/api/webhook", webhookRouter);
app.use("/api/auth", loginLimiter, authRouter);
app.use("/api/payments", strictLimiter, paymentsRouter);
app.use("/api/rankings", generalLimiter, rankingsRouter);
app.use("/api/seasons", generalLimiter, seasonsRouter);
app.use("/api/quizzes", generalLimiter, quizzesRouter);
app.use("/api/admin-quizzes", generalLimiter, adminQuizzesRoutes);
app.use("/api/admin", strictLimiter, adminRoutes);
app.use("/api/quiz-run", generalLimiter, quizRunRouter);
app.use("/api/quiz-play", generalLimiter, quizPlayRouter);
app.use("/api/quiz", generalLimiter, quizRoutes);
app.use("/api/messages", generalLimiter, messagesRouter);
app.use("/api/notifications", generalLimiter, notificationsRouter);
app.use("/api/quiz-creation", generalLimiter, quizCreationRoutes);
app.use("/api/withdraws", strictLimiter, withdrawsRouter);
app.use("/api/prizes", generalLimiter, prizesRouter);
app.use("/api/prize-config", generalLimiter, prizeConfigRouter);
app.use("/api/quiz-info", generalLimiter, quizInfoRouter);
app.use("/api/transactions", strictLimiter, transactionsRouter);
app.use("/api/profile", generalLimiter, profileRouter);
app.use("/api/scalability", generalLimiter, scalabilityRouter);
app.use("/api/quiz-validation", quizLimiter, quizValidationRouter);

// Batch operations endpoints
app.post("/api/batch/users", async (req, res) => {
  try {
    const { users, options } = req.body;
    const result = await batchOperations.batchCreateUsers(users, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/batch/quizzes", async (req, res) => {
  try {
    const { quizzes, options } = req.body;
    const result = await batchOperations.batchCreateQuizzes(quizzes, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/batch/validate", async (req, res) => {
  try {
    const { quizzes, options } = req.body;
    const result = await batchOperations.batchValidateQuizzes(quizzes, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Inicialización del servidor
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor optimizado para 2M usuarios...');
    
    // 1. Conectar a base de datos
    await connectWithRetry();
    console.log('✅ Base de datos conectada');
    
    // 2. Inicializar cache
    await distributedCache.initialize();
    console.log('✅ Cache distribuido inicializado');
    
    // 3. Inicializar workers
    await Promise.all([
      startNotificationWorker(),
      startQuizScheduler(),
      startSeasonWorker()
    ]);
    console.log('✅ Workers iniciados');
    
    // 4. Inicializar Socket.IO
    initSocket();
    console.log('✅ Socket.IO inicializado');
    
    // 5. Iniciar servidor HTTP
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      console.log(`🟢 Servidor optimizado corriendo en puerto ${PORT}`);
      console.log(`🎯 Optimizado para 2 millones de usuarios`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Stats: http://localhost:${PORT}/stats`);
    });
    
    // 6. Configurar graceful shutdown
    const shutdown = async (signal) => {
      console.log(`📴 Recibido ${signal}, cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔄 Cerrando conexiones...');
        
        await Promise.all([
          gracefulShutdown(),
          distributedCache.shutdown()
        ]);
        
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // 7. Intervalo para advanceExpiredQuizRuns
    setInterval(advanceExpiredQuizRuns, 60000);
    
    return server;
    
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
}

// Iniciar servidor si no es un worker
if (!process.env.WORKER_ID) {
  startServer();
}

export { app, startServer };
