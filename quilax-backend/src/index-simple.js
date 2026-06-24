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

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: "Too many requests",
    message: "Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/webhook", webhookRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/auth", authRouter);
app.use("/api/rankings", rankingsRouter);
app.use("/api/seasons", seasonsRouter);
app.use("/api/quizzes", quizzesRouter);
app.use("/api/admin-quizzes", adminQuizzesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/quiz-run", quizRunRouter);
app.use("/api/quiz-play", quizPlayRouter);
app.use("/api/quiz", quizRoutes);
app.use("/api/messages", messagesRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/quiz-creation", quizCreationRoutes);
app.use("/api/withdraws", withdrawsRouter);
app.use("/api/prizes", prizesRouter);
app.use("/api/prize-config", prizeConfigRouter);
app.use("/api/quiz-info", quizInfoRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/scalability", scalabilityRouter);

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
  });
}
