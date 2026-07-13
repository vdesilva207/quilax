import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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
import quizValidationRouter from "./routes/quizValidation.js";
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

// Rate limiting dinámico para 2M usuarios
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
});

// Limites optimizados para alta concurrencia
const loginLimiter = createDynamicLimiter(2000000, ['/api/auth/login']); // 2M logins
const quizLimiter = createDynamicLimiter(1000000, ['/api/quiz-validation']); // 1M validaciones
const generalLimiter = createDynamicLimiter(500000, []); // 500K requests generales
const strictLimiter = createDynamicLimiter(100000, []); // 100K para endpoints sensibles

app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/webhook", webhookRouter);
// Aplicar rate limiting específico por endpoint
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

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
initSocket(server);
const PORT = Number(process.env.PORT) || 3000;

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Stop it or change PORT.`);
    return;
  }

  if (err?.code === "EACCES") {
    console.error(`❌ Permission denied for port ${PORT}. Use a non-privileged port.`);
    return;
  }

  console.error("❌ Server error:", err);
});

if (process.env.NODE_ENV !== "test") {
  setInterval(async () => {
    try {
      await advanceExpiredQuizRuns();
    } catch (err) {
      console.error("❌ Quiz loop error:", err);
    }
  }, 1000);
}

export default app;

if (process.env.NODE_ENV !== "test") {
  startNotificationWorker();
  startQuizScheduler();
  startSeasonWorker();
  
  server.listen(PORT, () => {
    console.log(`🚀 Backend + Socket.IO running on ${PORT}`);
    console.log(`🎯 Optimized for high concurrency`);
  });
}
