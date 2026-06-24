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

