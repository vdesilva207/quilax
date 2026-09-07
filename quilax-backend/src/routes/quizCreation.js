import express from "express";
import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  getMyDrafts,
} from "../controllers/quizCreationController.js";

import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

/*
====================================
ROUTES
====================================
*/

router.post("/", auth, createQuiz);

/**
 * ¿Puede el usuario escribir al admin? (ventana 72h tras envío/rechazo)
 * BEFORE /:id routes
 */
router.get("/can-message-admin", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        quizSubmittedAt: true,
        quizRejectedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const HOURS_72 = 72 * 60 * 60 * 1000;

    let canMessage = false;
    let reason = "";
    let expiresAt = null;

    if (user.quizSubmittedAt) {
      const timeSinceSubmission = now.getTime() - user.quizSubmittedAt.getTime();
      if (timeSinceSubmission <= HOURS_72) {
        canMessage = true;
        reason = "Quiz enviado a revisión recientemente";
        expiresAt = new Date(user.quizSubmittedAt.getTime() + HOURS_72).toISOString();
      }
    }

    if (user.quizRejectedAt) {
      const timeSinceRejection = now.getTime() - user.quizRejectedAt.getTime();
      if (timeSinceRejection <= HOURS_72) {
        canMessage = true;
        reason = "Quiz rechazado recientemente";
        const rejectExpiry = new Date(user.quizRejectedAt.getTime() + HOURS_72).toISOString();
        if (!expiresAt || rejectExpiry > expiresAt) expiresAt = rejectExpiry;
      }
    }

    res.json({
      canMessage,
      reason,
      expiresAt,
      quizSubmittedAt: user.quizSubmittedAt,
      quizRejectedAt: user.quizRejectedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error checking admin messaging permission" });
  }
});

/**
 * Spellcheck stub (frontend expects corrected/changed)
 * BEFORE /:id routes
 */
router.post("/spellcheck", auth, async (req, res) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text : "";
    res.json({
      ok: true,
      suggestions: [],
      corrected: text,
      changed: false,
      count: 0,
    });
  } catch (err) {
    console.error("spellcheck error:", err);
    res.status(500).json({ error: "Spellcheck failed" });
  }
});

router.put("/:id", auth, updateQuiz);

router.delete("/:id", auth, deleteQuiz);

router.get("/my-drafts", auth, getMyDrafts);

router.post("/:id/publish", auth, publishQuiz);

// Quiz analytics para creadores
router.get("/:id/analytics", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = parseInt(req.params.id);

    // Verificar que el usuario es el creador del quiz
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { creatorId: true, scheduledEnd: true, status: true }
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz no encontrado" });
    }

    if (quiz.creatorId !== userId) {
      return res.status(403).json({ error: "No tienes permiso para ver las analytics de este quiz" });
    }

    // Verificar si el quiz ya terminó
    if (quiz.status !== "COMPLETED") {
      return res.status(400).json({ error: "El quiz aún no ha terminado" });
    }

    // Verificar si han pasado 7 días desde que terminó
    const sevenDaysAfterEnd = new Date(new Date(quiz.scheduledEnd).getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > sevenDaysAfterEnd) {
      // Verificar si el usuario ha jugado 10 quizzes desde que envió este quiz
      const quizzesPlayedSince = await prisma.quizParticipant.count({
        where: {
          userId,
          quizRun: {
            createdAt: { gte: quiz.scheduledEnd }
          }
        }
      });

      if (quizzesPlayedSince < 10) {
        return res.status(403).json({
          error: "Las analytics están bloqueadas. Necesitas jugar 10 quizzes más para ver las analytics de este quiz.",
          quizzesPlayed: quizzesPlayedSince,
          quizzesNeeded: 10
        });
      }
    }

    // Obtener analytics del quiz
    const quizRuns = await prisma.quizRun.findMany({
      where: { quizId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        answers: true
      }
    });

    const totalPlayers = quizRuns.length;
    const completedRuns = quizRuns.filter(run => run.status === "COMPLETED");
    const completionRate = totalPlayers > 0 ? (completedRuns.length / totalPlayers) * 100 : 0;

    // Tiempo promedio de juego
    const avgPlayTime = completedRuns.length > 0
      ? completedRuns.reduce((sum, run) => {
          const duration = new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime();
          return sum + duration;
        }, 0) / completedRuns.length / 1000 // Convertir a segundos
      : 0;

    // Análisis de preguntas
    const questions = await prisma.question.findMany({
      where: { quizId },
      include: {
        answers: {
          include: {
            quizRun: {
              where: { status: "COMPLETED" }
            }
          }
        }
      }
    });

    const questionAnalysis = questions.map(q => {
      const totalAnswers = q.answers.length;
      const correctAnswers = q.answers.filter(a => a.isCorrect).length;
      const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;
      const avgTime = totalAnswers > 0
        ? q.answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / totalAnswers
        : 0;

      return {
        questionId: q.id,
        question: q.question,
        totalAnswers,
        correctAnswers,
        accuracy,
        avgTime
      };
    });

    // Análisis económico
    const totalPrizes = quizRuns.reduce((sum, run) => sum + (run.prize || 0), 0);
    const creatorEarnings = quizRuns.reduce((sum, run) => sum + (run.creatorEarnings || 0), 0);

    // Lista de ganadores
    const winners = quizRuns
      .filter(run => run.prize > 0)
      .map(run => {
        const participant = run.participants[0];
        return {
          userId: participant?.userId,
          username: participant?.user?.username,
          prize: run.prize,
          score: participant?.score || 0
        };
      })
      .sort((a, b) => b.prize - a.prize);

    res.json({
      success: true,
      analytics: {
        totalPlayers,
        completionRate,
        avgPlayTime,
        questionAnalysis,
        totalPrizes,
        creatorEarnings,
        winners
      }
    });
  } catch (error) {
    console.error("Error getting quiz analytics:", error);
    res.status(500).json({ error: "Error al obtener analytics del quiz" });
  }
});

// Obtener mis quizzes con analytics básicas
router.get("/my-quizzes", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const quizzes = await prisma.quiz.findMany({
      where: { creatorId: userId },
      include: {
        _count: {
          select: {
            quizRuns: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const quizzesWithAnalytics = quizzes.map(quiz => {
      const sevenDaysAfterEnd = quiz.scheduledEnd
        ? new Date(new Date(quiz.scheduledEnd).getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;
      const now = new Date();

      let analyticsAvailable = false;
      if (quiz.status === "COMPLETED" && sevenDaysAfterEnd) {
        analyticsAvailable = now <= sevenDaysAfterEnd;
      }

      return {
        ...quiz,
        totalPlays: quiz._count.quizRuns,
        analyticsAvailable
      };
    });

    res.json({
      success: true,
      quizzes: quizzesWithAnalytics
    });
  } catch (error) {
    console.error("Error getting my quizzes:", error);
    res.status(500).json({ error: "Error al obtener mis quizzes" });
  }
});

// Obtener fechas ocupadas por quizzes (para creadores)
router.get("/occupied-dates", async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: "Se requieren year y month" });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    // Obtener quizzes con fechas programadas en el mes especificado
    const quizzes = await prisma.quiz.findMany({
      where: {
        requestedDate: {
          gte: startDate,
          lte: endDate
        },
        status: {
          in: ['PENDING_REVIEW', 'APPROVED', 'SCHEDULED']
        }
      },
      select: {
        id: true,
        requestedDate: true,
        status: true
      }
    });

    // Agrupar por fecha y hora
    const occupiedDates = {};

    quizzes.forEach(quiz => {
      const date = new Date(quiz.requestedDate);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const hourKey = `${date.getHours()}`;
      const minuteKey = `${date.getMinutes()}`;

      if (!occupiedDates[dateKey]) {
        occupiedDates[dateKey] = {
          date: dateKey,
          hours: {}
        };
      }

      if (!occupiedDates[dateKey].hours[hourKey]) {
        occupiedDates[dateKey].hours[hourKey] = {
          hour: hourKey,
          minutes: {},
          status: quiz.status === 'APPROVED' || quiz.status === 'SCHEDULED' ? 'approved' : 'pending'
        };
      }

      occupiedDates[dateKey].hours[hourKey].minutes[minuteKey] = {
        minute: minuteKey,
        status: quiz.status === 'APPROVED' || quiz.status === 'SCHEDULED' ? 'approved' : 'pending'
      };
    });

    res.json({
      success: true,
      occupiedDates: Object.values(occupiedDates)
    });
  } catch (error) {
    console.error("Error getting occupied dates:", error);
    res.status(500).json({ error: "Error al obtener fechas ocupadas" });
  }
});

export default router;