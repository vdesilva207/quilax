import express from "express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { auth } from "../middleware/auth.js";
import { getIO } from "../socket.js";
import { aggregateMaxCredits, calculateMaxCredits } from "../utils/quizCredits.js";

const router = express.Router();
const ENTRY_COST = 1;

const EARLY_JOIN_BONUS_RANGES = [
  { from: 1, to: 1, bonus: 600 },
  { from: 2, to: 5, bonus: 520 },
  { from: 6, to: 10, bonus: 450 },
  { from: 11, to: 20, bonus: 360 },
  { from: 21, to: 30, bonus: 285 },
  { from: 31, to: 40, bonus: 225 },
  { from: 41, to: 50, bonus: 175 },
  { from: 51, to: 60, bonus: 140 },
  { from: 61, to: 70, bonus: 115 },
  { from: 71, to: 80, bonus: 95 },
  { from: 81, to: 89, bonus: 80 },
  { from: 90, to: 100, bonus: 70 },
];

function getEarlyJoinBonus(joinPosition) {
  const range = EARLY_JOIN_BONUS_RANGES.find(
    ({ from, to }) => joinPosition >= from && joinPosition <= to
  );

  return range ? range.bonus : 0;
}

// --------------------
// 📝 Inscribirse en un quiz (antes del run)
// --------------------
router.post("/enroll/:quizId", auth, async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    const userId = req.user.id;

    if (!quizId) {
      return res.status(400).json({ error: "quizId inválido" });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz no encontrado" });
    }

    const existing = await prisma.quizEnrollment.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });

    if (existing) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      return res.json({
        success: true,
        enrollment: existing,
        balance: user?.balance ?? 0,
        alreadyEnrolled: true,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.balance < ENTRY_COST) throw new Error("INSUFFICIENT_BALANCE");

      const enrollment = await tx.quizEnrollment.create({
        data: { quizId, userId },
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: ENTRY_COST } },
        select: { balance: true },
      });

      await tx.transaction.create({
        data: {
          userId,
          quizId,
          type: "QUIZ_ENTRY",
          amount: ENTRY_COST,
          currency: "CREDIT",
        },
      });

      return { enrollment, balance: updatedUser.balance };
    });

    return res.json({
      success: true,
      enrollment: result.enrollment,
      balance: result.balance,
    });
  } catch (err) {
    if (err.message === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    console.error("Error enrolling:", err);
    return res.status(500).json({ error: "Error al inscribirse" });
  }
});

// --------------------
// 🎬 Asegurar QuizRun en PRE_START
// --------------------
router.post("/ensure-run/:quizId", auth, async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    if (!quizId) {
      return res.status(400).json({ error: "quizId inválido" });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ error: "Quiz no encontrado" });
    }

    let run = await prisma.quizRun.findFirst({
      where: {
        quizId,
        phase: { not: "FINISHED" },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!run) {
      run = await prisma.quizRun.create({
        data: {
          quizId,
          phase: "PRE_START",
        },
      });
    }

    return res.json({
      run: {
        id: run.id,
        quizId: run.quizId,
        phase: run.phase,
        currentIndex: run.currentIndex,
        totalPrizeCredits: run.totalPrizeCredits,
        startedAt: run.startedAt,
        phaseStartedAt: run.phaseStartedAt,
        phaseEndsAt: run.phaseEndsAt,
        finishedAt: run.finishedAt,
        createdAt: run.createdAt,
      },
    });
  } catch (err) {
    console.error("Error ensure-run:", err);
    return res.status(500).json({ error: "Error al asegurar run" });
  }
});

// --------------------
// 🔌 Desconectar participante
// --------------------
router.post("/:quizRunId/disconnect", auth, async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);
    const userId = req.user.id;

    if (!quizRunId) {
      return res.status(400).json({ error: "quizRunId inválido" });
    }

    const participant = await prisma.quizParticipant.findUnique({
      where: {
        quizRunId_userId: { quizRunId, userId },
      },
    });

    if (participant) {
      await prisma.quizParticipant.update({
        where: { id: participant.id },
        data: { status: "DISCONNECTED" },
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error disconnect:", err);
    return res.status(500).json({ error: "Error al desconectar" });
  }
});

// --------------------
// ⬆️ Unirse a un quiz en curso
// --------------------
router.post("/:quizRunId/join", auth, async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: { quiz: true },
    });

    if (!run) return res.status(404).json({ error: "Quiz no encontrado" });

    if (run.phase !== "PRE_START")
      return res.status(400).json({ error: "El quiz ya ha comenzado" });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (user.balance < ENTRY_COST) {
      return res.status(400).json({
        error: "Saldo insuficiente",
      });
    }

    const joinResult = await prisma.$transaction(async (tx) => {
      const existingParticipant = await tx.quizParticipant.findUnique({
        where: {
          quizRunId_userId: {
            quizRunId,
            userId: user.id,
          },
        },
      });

      if (existingParticipant) {
        return {
          alreadyJoined: true,
          joinPosition: null,
          earlyJoinBonus: existingParticipant.score || 0,
          totalPrizeCredits: run.totalPrizeCredits,
        };
      }

      const participantsCount = await tx.quizParticipant.count({
        where: { quizRunId },
      });

      const joinPosition = participantsCount + 1;
      const earlyJoinBonus = getEarlyJoinBonus(joinPosition);

      await tx.quizParticipant.create({
        data: {
          quizRunId,
          userId: user.id,
          status: "ACTIVE",
          score: earlyJoinBonus,
        },
      });

      await tx.quizScore.upsert({
        where: {
          quizRunId_userId: {
            quizRunId,
            userId: user.id,
          },
        },
        update: {
          score: earlyJoinBonus,
        },
        create: {
          quizRunId,
          userId: user.id,
          score: earlyJoinBonus,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: ENTRY_COST },
        },
      });

      const updatedRun = await tx.quizRun.update({
        where: { id: quizRunId },
        data: {
          totalPrizeCredits: { increment: ENTRY_COST },
        },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          quizId: run.quizId,
          amount: ENTRY_COST,
          currency: "CREDIT",
          type: "QUIZ_ENTRY",
        },
      });

      return {
        alreadyJoined: false,
        joinPosition,
        earlyJoinBonus,
        totalPrizeCredits: updatedRun.totalPrizeCredits,
      };
    });

    if (joinResult.alreadyJoined) {
      return res.json({
        joined: true,
        alreadyJoined: true,
        totalPrizeCredits: joinResult.totalPrizeCredits,
        earlyJoinBonus: joinResult.earlyJoinBonus,
        message: "Ya estabas inscrito",
      });
    }

    await redis.sadd(`quizRun:${quizRunId}:participants`, String(user.id));
    await redis.zadd(
      `quizRun:${quizRunId}:scores`,
      joinResult.earlyJoinBonus,
      String(user.id)
    );

    const rulesWithCredits = await calculateMaxCredits(
      run.quiz.id,
      joinResult.totalPrizeCredits
    );

    const totalDistributedPreview = aggregateMaxCredits(rulesWithCredits);

    const io = getIO();
    io.to(`quiz-${quizRunId}`).emit("quiz:prize-update", {
      totalPrizeCredits: joinResult.totalPrizeCredits,
      totalDistributedPreview,
    });

    return res.json({
      joined: true,
      joinPosition: joinResult.joinPosition,
      earlyJoinBonus: joinResult.earlyJoinBonus,
      totalPrizeCredits: joinResult.totalPrizeCredits,
      totalDistributedPreview,
    });
  } catch (err) {
    console.error("Error joining quiz:", err);
    return res.status(500).json({ error: "Error interno" });
  }
});

// --------------------
// 🔹 Estado actual
// --------------------
router.get("/:quizRunId/state", auth, async (req, res) => {
  const quizRunId = Number(req.params.quizRunId);

  const run = await prisma.quizRun.findUnique({
    where: { id: quizRunId },
    include: {
  quiz: {
    include: {
      questions: {
        include: {
          answers: true,
        },
      },
    },
  },
},
  });

  if (!run) return res.status(404).json({ error: "Quiz no encontrado" });

  res.json({
    phase: run.phase,
    phaseEndsAt: run.phaseEndsAt,
    currentQuestionIndex: run.currentIndex,
    question:
      run.phase.includes("QUESTION") &&
      run.quiz.questions[run.currentIndex]
        ? run.quiz.questions[run.currentIndex]
        : null,
  });
});

// --------------------
// 💰 Bote actual
// --------------------
router.get("/:quizRunId/prize", async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: { quiz: true },
    });

    if (!run) return res.status(404).json({ error: "Quiz no encontrado" });

    const totalPrizeCredits = run.totalPrizeCredits;

    const rulesWithCredits = await calculateMaxCredits(
      run.quiz.id,
      totalPrizeCredits
    );

    const prizeData = aggregateMaxCredits(rulesWithCredits);

    res.json({
      totalPrizeCredits,
      prizes: prizeData,
    });
  } catch (err) {
    console.error("Error fetching prize:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --------------------
// ✍️ Responder
// --------------------
router.post("/:quizRunId/answer", auth, async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);
    const { answer } = req.body;
    const userId = req.user.id;
    const now = new Date();

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: {
  quiz: {
    include: {
      questions: {
        include: {
          answers: true,
        },
      },
    },
  },
},
    });

    if (!run || run.phase !== "QUESTION_ANSWER") {
      return res.status(400).json({ error: "No se puede responder ahora" });
    }

    const question = run.quiz.questions[run.currentIndex];

    const correctAnswer = question.answers.find(a => a.isCorrect);

   const isCorrect =
   answer.trim().toLowerCase() ===
   correctAnswer.text.trim().toLowerCase();

    const responseTimeMs = calculateServerResponseTime({
      phaseStartedAt: run.phaseStartedAt,
      now,
    });

    detectFastResponse({
      responseTimeMs,
      userId,
      quizRunId,
    });

    const score = calculateSecureScore({
      responseTimeMs,
      isCorrect,
    });

    // IP y User-Agent
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      null;

    const userAgent = req.headers["user-agent"] || null;

    const result = await prisma.$transaction(async (tx) => {
      const answerRow = await tx.quizRunAnswer.create({
        data: {
          quizRunId,
          questionId: question.id,
          userId,
          answer,
          isCorrect,
          score,
          responseTimeMs,
          ipAddress: ip,
          userAgent,
        },
      });

      if (score > 0) {
        await tx.quizScore.update({
          where: {
            quizRunId_userId: {
              quizRunId,
              userId,
            },
          },
          data: {
            score: { increment: score },
          },
        });
      }

      return answerRow;
    });

    await seasonService.addSeasonPoints(userId, score);

    res.json({
      allowed: true,
      isCorrect,
      score,
    });

  } catch (err) {
    console.error("Error answer:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --------------------
// 🏆 Ranking
// --------------------
router.get("/:quizRunId/ranking", async (req, res) => {
  const quizRunId = Number(req.params.quizRunId);

  const top = await prisma.quizScore.findMany({
    where: { quizRunId },
    orderBy: { score: "desc" },
    take: 5,
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  res.json({ top });
});

// --------------------
// 🏁 Resultados
// --------------------
router.get("/:quizRunId/results", auth, async (req, res) => {
  const quizRunId = Number(req.params.quizRunId);

  const winners = await prisma.quizWinner.findMany({
    where: { quizRunId },
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  const isWinner = winners.some((w) => w.userId === req.user.id);

  res.json({ winners, isWinner });
});

// --------------------
// 👥 Participantes actuales
// --------------------
router.get("/:quizRunId/participants", async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
    });

    if (!run) return res.status(404).json({ error: "Quiz no encontrado" });

    const participantsCount = await prisma.quizParticipant.count({
      where: { quizRunId },
    });

    const nextPosition = participantsCount + 1;
    const earlyJoinBonus = getEarlyJoinBonus(nextPosition);

    res.json({
      participantsCount,
      nextPosition,
      earlyJoinBonus,
      maxParticipants: 100, // Valor por defecto, podría venir de la configuración del quiz
    });
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;

