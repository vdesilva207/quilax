import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./lib/prisma.js";

let io = null;

export function initSocket(httpServer) {
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

  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Permitir requests sin origin (como mobile apps o curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token || !process.env.JWT_SECRET) {
        return next(new Error("No autorizado"));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);

      if (!payload?.id) {
        return next(new Error("No autorizado"));
      }

      socket.userId = Number(payload.id);
      return next();
    } catch (err) {
      return next(new Error("No autorizado"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket conectado", socket.id);

socket.on("join", () => {
  socket.join(`user:${socket.userId}`);
  console.log(`👤 User ${socket.userId} unido a su room`);
});

    /*
    ============================
    QUIZ JOIN
    ============================
    */
    socket.on("quiz:join", async (quizRunId) => {
      const room = `quiz-${quizRunId}`;
      socket.join(room);

      try {
        const run = await prisma.quizRun.findUnique({
          where: { id: quizRunId },
        });

        if (run) {
          socket.emit("quiz:state", {
            quizRunId: run.id,
            phase: run.phase,
            currentIndex: run.currentIndex,
            phaseEndsAt: run.phaseEndsAt,
          });
        }
      } catch (err) {
        console.error("❌ quiz:join error:", err);
      }
    });

    /*
    ============================
    SEND MESSAGE (REALTIME)
    ============================
    */
    socket.on("send_message", async ({ toUserId, content }) => {
      try {
        const fromUserId = socket.userId;

        if (!fromUserId || !toUserId || typeof content !== "string" || !content.trim()) {
          return;
        }

        const blocked = await prisma.userBlock.findFirst({
          where: {
            OR: [
              { blockerId: toUserId, blockedId: fromUserId },
              { blockerId: fromUserId, blockedId: toUserId },
            ],
          },
        });

        if (blocked) return;

        const message = await prisma.message.create({
          data: {
            fromUserId,
            toUserId,
            content,
          },
        });

        // enviar al receptor
        io.to(`user:${toUserId}`).emit("new_message", message);

        // enviar al emisor (sync UI)
        io.to(`user:${fromUserId}`).emit("message_sent", message);
      } catch (err) {
        console.error("❌ send_message error:", err);
      }
    });

    /*
    ============================
    MARK READ
    ============================
    */
    socket.on("mark_read", async ({ otherUserId }) => {
      try {
        const userId = socket.userId;

        if (!userId || !otherUserId) {
          return;
        }

        await prisma.message.updateMany({
          where: {
            fromUserId: otherUserId,
            toUserId: userId,
            isRead: false,
          },
          data: { isRead: true },
        });
      } catch (err) {
        console.error("❌ mark_read error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket desconectado", socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io no inicializado");
  return io;
}
