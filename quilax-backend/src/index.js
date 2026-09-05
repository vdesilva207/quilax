import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cluster from "cluster";
import os from "os";

import jackpotRouter from "./routes/jackpot.js";
import adminAuthRouter from "./routes/adminAuth.js";
import webhookRouter from "./routes/webhook.js";
import paymentsRouter from "./routes/payments.js";
import authRouter from "./routes/auth.js";
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
import enhancedKycRouter from "./routes/enhancedKyc.js";
import supportRouter from "./routes/support.js";
import helpRouter from "./routes/help.js";
import homeRouter from "./routes/home.js";
import searchRouter from "./routes/search.js";
import socialRouter from "./routes/social.js";
import faqRouter from "./routes/faq.js";
import legalRouter from "./routes/legal.js";
import reportsRouter from "./routes/reports.js";
import walletAccessRouter from "./routes/walletAccess.js";
import redis from "./lib/redis.js";
import prisma from "./lib/prisma.js";
import { platformMiddleware } from "./middleware/platform.js";
import scalabilityManager from "./utils/scalabilityManager.js";
import { metricsMiddleware, metricsEndpoint } from "./config/monitoring.js";
import { rateLimiters } from "./middleware/rateLimiter.js";

import { startNotificationWorker } from "./workers/notificationWorker.js";
import { auth, roleMiddleware } from "./middleware/auth.js";
import { startQuizScheduler } from "./workers/quizScheduler.js";
import { initSocket } from "./socket.js";
import { advanceExpiredQuizRuns } from "./services/quizEngine.js";
import { startSeasonWorker } from "./workers/seasonWorker.js";
import { startWithdrawScheduler } from "./workers/withdrawScheduler.js";
import { startPasswordChangeScheduler } from "./workers/passwordChangeScheduler.js";
import "./workers/answerWorker.js";

dotenv.config();

// Validar que los secrets sean suficientemente seguros en producción
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET debe tener al menos 32 caracteres en producción');
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
    console.error('❌ ENCRYPTION_KEY debe tener al menos 32 caracteres en producción');
    process.exit(1);
  }
}

const app = express();




app.set("trust proxy", 1);


app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);


app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (como mobile apps o curl)
      if (!origin) return callback(null, true);

      const envOrigins = process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:5173', 'http://localhost:3000'];

      const devOrigins = [
        'http://localhost:8081',
        'http://127.0.0.1:8081',
        'http://localhost:8082',
        'http://127.0.0.1:8082',
        'http://localhost:19006',
        'http://127.0.0.1:19006',
      ];

      const allowedOrigins = [...new Set([...envOrigins, ...devOrigins])];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else if (
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
          origin
        )
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  })
);


app.use(express.json({ limit: "100kb" }));

app.use(platformMiddleware);

// Middleware de monitoreo Prometheus
app.use(metricsMiddleware);

// Rate limiting distribuido optimizado para 2M usuarios
app.use(rateLimiters.general);


app.use("/jackpot", jackpotRouter);
app.use("/admin-auth", adminAuthRouter);
app.use("/webhook", express.raw({ type: "*/*" }), webhookRouter);

// Rate limiting específico para auth endpoints
app.use("/auth", rateLimiters.auth, authRouter);

app.use("/payments", paymentsRouter);
app.use("/withdraws", withdrawsRouter);
app.use("/prizes", prizesRouter);
app.use("/prize-config", prizeConfigRouter);
app.use("/quiz-info", quizInfoRouter);
app.use("/transactions", transactionsRouter);
app.use("/profile", profileRouter);
app.use("/rankings", rankingsRouter);
app.use("/seasons", seasonsRouter);
app.use("/quizzes", quizzesRouter);
app.use("/admin/quizzes", adminQuizzesRoutes);
app.use("/quiz-run", quizRunRouter);
app.use("/quiz-creation", rateLimiters.quizCreation, quizCreationRoutes);
app.use("/quiz-play", rateLimiters.quizParticipation, quizPlayRouter);
app.use("/quiz", quizRoutes);
app.use("/messages", rateLimiters.messages, messagesRouter);
app.use("/notifications", notificationsRouter);
app.use("/scalability", scalabilityRouter);
app.use("/enhanced-kyc", enhancedKycRouter);
app.use("/support", rateLimiters.supportTickets, supportRouter);
app.use("/help", helpRouter);
app.use("/home", homeRouter);
app.use("/search", searchRouter);
app.use("/social", socialRouter);
app.use("/faq", faqRouter);
app.use("/legal", legalRouter);
app.use("/reports", reportsRouter);
app.use("/wallet-access", walletAccessRouter);
app.use("/admin", adminRoutes);

await redis.set("test", "quilax");
const value = await redis.get("test");

console.log("REDIS TEST:", value);


app.get(
  "/admin/secret",
  auth,
  roleMiddleware(["ADMIN"]),
  (req, res) => {
    res.json({
      message: "Bienvenido admin",
      user: req.user.email,
    });
  }
);



app.get("/", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) =>
  res.json({
    ok: true,
    commit: process.env.RENDER_GIT_COMMIT || null,
  })
);

app.get("/health/db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (err) {
    console.error("❌ /health/db:", err?.message || err);
    res.status(503).json({ ok: false, db: false, error: "Database unreachable" });
  }
});

// Endpoint de métricas Prometheus
app.get("/metrics", metricsEndpoint);

app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);

  res.status(err.status || 500).json({
    error: "Internal server error",
  });
});


if (process.env.NODE_ENV !== "test") {
  startQuizScheduler();
  startSeasonWorker();
  startNotificationWorker();
  startWithdrawScheduler();
  startPasswordChangeScheduler();
}


const server = http.createServer(app);
initSocket(server);
const PORT = Number(process.env.PORT) || 3000;

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Stop the other process or change PORT.`);
    return;
  }

  if (err?.code === "EACCES") {
    console.error(`❌ Permission denied for port ${PORT}. Use a non-privileged port.`);
    return;
  }

  console.error("❌ Server error:", err);
});

export default app;

// Configuración de clustering para 2M usuarios
const numCPUs = os.cpus().length;

// Clustering activado para producción
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_CLUSTERING === 'true') {
  console.log(`🎯 Master ${process.pid} is running`);
  console.log(`🚀 Starting ${numCPUs} workers for high concurrency`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Manejo de workers que mueren
  cluster.on('exit', (worker, code, signal) => {
    console.log(`❌ Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Manejo de señales para graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
  });

  process.on('SIGINT', () => {
    console.log('🔄 SIGINT received. Shutting down gracefully...');
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM');
    }
  });

} else {
  // Modo desarrollo - sin clustering
  if (process.env.NODE_ENV !== "test") {
    // Iniciar el servidor
    server.listen(PORT, () => {
      console.log(`🚀 Backend + Socket.IO running on ${PORT} (development mode)`);
    });

    // Intentar inicializar Scalability Manager en segundo plano
    console.log('🔄 Initializing Scalability Manager...');
    scalabilityManager.on('initialized', () => {
      console.log(`🎯 Scalability Manager ready`);
    });

    scalabilityManager.on('error', (error) => {
      console.error('❌ Scalability Manager error:', error);
    });
  } else {
    server.listen(PORT, () => {
      console.log(`🚀 Backend + Socket.IO running on ${PORT} (test mode)`);
    });
  }
}