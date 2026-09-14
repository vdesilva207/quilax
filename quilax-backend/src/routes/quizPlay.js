import express from "express";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import { auth } from "../middleware/auth.js";
import { requireMoneyEligibility } from "../middleware/moneyEligibility.js";
import { getIO } from "../socket.js";
import { aggregateMaxCredits, calculateMaxCredits } from "../utils/quizCredits.js";
import { ensureActiveQuizRun, submitAnswer } from "../services/quizEngine.js";
import {
  getEarlyJoinBonus,
  buildEarlyJoinPreview,
} from "../constants/earlyJoinBonus.js";

const router = express.Router();
const ENTRY_COST = 1;

// --------------------
// 📝 Inscribirse en un quiz (antes del run)
// --------------------
router.post("/enroll/:quizId", auth, requireMoneyEligibility("QUIZ_ENTRY"), async (req, res) => {
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

    let enrollment = existing;
    let balance;
    let alreadyEnrolled = false;

    if (existing) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      balance = user?.balance ?? 0;
      alreadyEnrolled = true;
    } else {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error("USER_NOT_FOUND");
        if (user.balance < ENTRY_COST) throw new Error("INSUFFICIENT_BALANCE");

        const created = await tx.quizEnrollment.create({
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

        return { enrollment: created, balance: updatedUser.balance };
      });
      enrollment = result.enrollment;
      balance = result.balance;
    }

    // Enroll only — do NOT open lobby. Lobby opens T−1min via scheduler.
    const run = await prisma.quizRun.findFirst({
      where: { quizId, phase: { not: "FINISHED" } },
      orderBy: { createdAt: "desc" },
    });
    const lobbyOpen = run?.phase === "PRE_START";

    const nextSchedule = await prisma.quizSchedule.findFirst({
      where: {
        quizId,
        scheduledAt: { gte: new Date(Date.now() - 30_000) },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return res.json({
      success: true,
      enrollment,
      balance,
      alreadyEnrolled,
      lobbyOpen,
      runId: lobbyOpen ? run.id : null,
      phase: run?.phase || null,
      startsAt: nextSchedule?.scheduledAt || null,
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

    const run = await ensureActiveQuizRun(quizId, req.user.id);

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
    if (err?.code === "LOBBY_NOT_OPEN" || err?.message === "LOBBY_NOT_OPEN") {
      return res.status(409).json({
        error: "El countdown aún no está abierto",
        code: "LOBBY_NOT_OPEN",
      });
    }
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
router.post("/:quizRunId/join", auth, requireMoneyEligibility("QUIZ_ENTRY"), async (req, res) => {
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

    const enrollment = await prisma.quizEnrollment.findUnique({
      where: {
        quizId_userId: { quizId: run.quizId, userId: user.id },
      },
    });
    const alreadyPaid = !!enrollment;

    if (!alreadyPaid && user.balance < ENTRY_COST) {
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
        // Never overwrite accrued question points — only seed on create
        update: {},
        create: {
          quizRunId,
          userId: user.id,
          score: earlyJoinBonus,
        },
      });

      // Enroll already charged ENTRY_COST — do not debit again.
      // Still credit the prize pool once when the participant joins.
      if (!alreadyPaid) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { decrement: ENTRY_COST },
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

        await tx.quizEnrollment.create({
          data: { quizId: run.quizId, userId: user.id },
        });
      }

      const updatedRun = await tx.quizRun.update({
        where: { id: quizRunId },
        data: {
          totalPrizeCredits: { increment: ENTRY_COST },
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
    // Seed Redis ranking with early-join bonus (NX: do not clobber if already answering)
    try {
      await redis.zadd(
        `quizRun:${quizRunId}:scores`,
        "NX",
        joinResult.earlyJoinBonus,
        String(user.id)
      );
    } catch {
      // ioredis NX signature variants — fallback absolute set only if missing
      const existing = await redis.zscore(`quizRun:${quizRunId}:scores`, String(user.id));
      if (existing == null) {
        await redis.zadd(
          `quizRun:${quizRunId}:scores`,
          joinResult.earlyJoinBonus,
          String(user.id)
        );
      }
    }

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
      earlyJoinPreview: buildEarlyJoinPreview(joinResult.joinPosition + 1),
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

  let question = null;
  if (
    run.phase &&
    String(run.phase).includes("QUESTION") &&
    run.quiz.questions[run.currentIndex]
  ) {
    question = run.quiz.questions[run.currentIndex];
    try {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT "imageUrl" FROM "QuizQuestion" WHERE id = $1`,
        question.id
      );
      if (rows?.[0]) question = { ...question, imageUrl: rows[0].imageUrl || null };
    } catch {
      /* ignore stale client */
    }
  }

  res.json({
    phase: run.phase,
    phaseEndsAt: run.phaseEndsAt,
    currentQuestionIndex: run.currentIndex,
    question,
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
    const { answer, questionId, responseTimeMs } = req.body || {};
    const userId = req.user.id;

    if (!quizRunId || !questionId || answer == null) {
      return res.status(400).json({ error: "Datos de respuesta incompletos" });
    }

    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      null;

    const result = await submitAnswer({
      quizRunId,
      questionId: Number(questionId),
      userId,
      answer: String(answer),
      responseTimeMs: Number(responseTimeMs) || 0,
      ipAddress: typeof ip === "string" ? ip.split(",")[0].trim() : ip,
    });

    if (!result?.allowed) {
      return res.status(400).json({
        error: result?.reason || "No se puede responder ahora",
        code: result?.reason,
      });
    }

    return res.json({
      allowed: true,
      isCorrect: result.isCorrect,
      score: result.score,
    });
  } catch (err) {
    console.error("Error answer:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --------------------
// 🏆 Ranking
// --------------------
router.get("/:quizRunId/ranking", auth, async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 5));
    const userId = req.user.id;

    const top = await prisma.quizScore.findMany({
      where: { quizRunId },
      orderBy: [{ score: "desc" }, { userId: "asc" }],
      take: limit,
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    // lastGain = score of each player's most recent answer in this run
    const userIds = [...new Set(top.map((r) => r.userId).concat(userId))];
    const recentAnswers = await prisma.quizRunAnswer.findMany({
      where: { quizRunId, userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: Math.max(50, userIds.length * 3),
      select: { userId: true, score: true },
    });
    const lastGainByUser = new Map();
    for (const a of recentAnswers) {
      if (!lastGainByUser.has(a.userId)) {
        lastGainByUser.set(a.userId, Number(a.score) || 0);
      }
    }

    const mapRow = (row, position) => ({
      userId: row.userId,
      score: row.score,
      lastGain: lastGainByUser.get(row.userId) ?? 0,
      position,
      user: row.user,
    });

    const rankedTop = top.map((row, i) => mapRow(row, i + 1));

    let me = null;
    const myScore = await prisma.quizScore.findUnique({
      where: {
        quizRunId_userId: { quizRunId, userId },
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (myScore) {
      const better = await prisma.quizScore.count({
        where: {
          quizRunId,
          OR: [
            { score: { gt: myScore.score } },
            { score: myScore.score, userId: { lt: userId } },
          ],
        },
      });
      me = mapRow(myScore, better + 1);
    }

    res.json({ top: rankedTop, me, ranking: rankedTop });
  } catch (err) {
    console.error("Error ranking:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

// --------------------
// 🏁 Resultados
// --------------------
router.get("/:quizRunId/results", auth, async (req, res) => {
  try {
    const quizRunId = Number(req.params.quizRunId);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const userId = req.user.id;

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      select: { phase: true, finishedAt: true },
    });

    if (!run) {
      return res.status(404).json({ error: "Quiz no encontrado" });
    }

    const winners = await prisma.quizWinner.findMany({
      where: { quizRunId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    const ranking = await prisma.quizScore.findMany({
      where: { quizRunId },
      orderBy: [{ score: "desc" }, { userId: "asc" }],
      take: limit,
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    const creditsByUser = new Map(
      winners.map((w) => [w.userId, Number(w.creditsWon) || 0])
    );

    const rankingWithPrizes = ranking.map((row, i) => ({
      userId: row.userId,
      score: row.score,
      position: i + 1,
      user: row.user,
      creditsWon: creditsByUser.get(row.userId) ?? 0,
    }));

    const myWinner = winners.find((w) => w.userId === userId);
    const myScore = await prisma.quizScore.findUnique({
      where: {
        quizRunId_userId: { quizRunId, userId },
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    let me = null;
    if (myScore) {
      const better = await prisma.quizScore.count({
        where: {
          quizRunId,
          OR: [
            { score: { gt: myScore.score } },
            { score: myScore.score, userId: { lt: userId } },
          ],
        },
      });
      me = {
        userId,
        score: myScore.score,
        position: better + 1,
        user: myScore.user,
        creditsWon: creditsByUser.get(userId) ?? myWinner?.creditsWon ?? 0,
      };
    }

    const prizesReady =
      run.phase === "FINISHED" &&
      (winners.length > 0 || Boolean(run.finishedAt));

    res.json({
      winners,
      isWinner: Boolean(myWinner),
      ranking: rankingWithPrizes,
      me,
      myPrize: myWinner?.creditsWon ?? 0,
      prizesReady,
    });
  } catch (err) {
    console.error("Error results:", err);
    res.status(500).json({ error: "Error interno" });
  }
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
      maxParticipants: null, // sin límite de producto; escala por infra
    });
  } catch (err) {
    console.error("Error fetching participants:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

export default router;

