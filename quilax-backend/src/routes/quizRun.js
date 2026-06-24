import { Router } from "express";
import {
  getQuizRunState,
  answerQuestion,
} from "../controllers/quizRunController.js";
import redis from "../lib/redis.js";
import { advanceQuizPhase } from "../services/quizEngine.js";
import { distributeRewards } from "../services/distributeRewards.js";
import { auth, roleMiddleware } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();

/**
 * ====================================
 * ESTADO DEL RUN
 * GET /quiz-run/:id/state
 * ====================================
 */
router.get("/:id/state", getQuizRunState);

/**
 * ====================================
 * RESPONDER PREGUNTA
 * POST /quiz-run/:id/answer
 * ====================================
 */
router.post("/:id/answer", auth, answerQuestion);

/**
 * ====================================
 * AVANZAR FASE (ADMIN / DEBUG)
 * POST /quiz-run/:quizRunId/advance
 * ====================================
 */
router.post("/:quizRunId/advance", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const run = await advanceQuizPhase(Number(req.params.quizRunId));

    res.json(run);
  } catch (err) {
    console.error("❌ advance phase error", err);
    res.status(500).json({ error: "Error advancing phase" });
  }
});

/**
 * ====================================
 * DISTRIBUIR RECOMPENSAS
 * POST /quiz-run/:id/distribute
 * ====================================
 */
router.post(
  "/:id/distribute",
  auth,
  roleMiddleware(["ADMIN"]),
  async (req, res) => {
  try {
    const runId = Number(req.params.id);

    const result = await distributeRewards(runId);

    res.json(result);
  } catch (err) {
    console.error("❌ distribute error", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/:id/live-ranking", async (req, res) => {
  try {
    const runId = req.params.id;

    const key = `quizRun:${runId}:scores`;

    const start = Number(req.query.start || 0);
const end = Number(req.query.end || 49);

const ranking = await redis.zrevrange(
  key,
  start,
  end,
  "WITHSCORES"
);

    const parsed = [];

    for (let i = 0; i < ranking.length; i += 2) {
      parsed.push({
        userId: Number(ranking[i]),
        score: Number(ranking[i + 1]),
      });
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error getting ranking" });
  }
});

/**
 * ====================================
 * QUIZ REVIEW - VER RESPUESTAS DESPUÉS DE JUGAR
 * GET /quiz-run/:id/review
 * ====================================
 */
router.get("/:id/review", auth, async (req, res) => {
  try {
    const runId = parseInt(req.params.id);
    const userId = req.user.id;

    const quizRun = await prisma.quizRun.findUnique({
      where: { id: runId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                answers: {
                  where: { userId }
                }
              }
            }
          }
        }
      }
    });

    if (!quizRun) {
      return res.status(404).json({ error: "Quiz run no encontrado" });
    }

    if (quizRun.userId !== userId) {
      return res.status(403).json({ error: "No tienes permiso para ver este quiz run" });
    }

    if (quizRun.phase !== "FINISHED") {
      return res.status(400).json({ error: "El quiz aún no ha terminado" });
    }

    const review = quizRun.quiz.questions.map(question => {
      const userAnswer = question.answers[0];
      return {
        questionId: question.id,
        question: question.question,
        options: question.options,
        correctOption: question.correctOption,
        userAnswer: userAnswer ? userAnswer.selectedOption : null,
        isCorrect: userAnswer ? userAnswer.selectedOption === question.correctOption : false,
        points: userAnswer ? userAnswer.points : 0,
        timeTaken: userAnswer ? userAnswer.timeTaken : null
      };
    });

    res.json({
      success: true,
      review: {
        quizRunId: quizRun.id,
        quizTitle: quizRun.quiz.title,
        score: quizRun.score,
        totalPoints: quizRun.totalPoints,
        prize: quizRun.prize,
        questions: review
      }
    });
  } catch (error) {
    console.error("Error getting quiz review:", error);
    res.status(500).json({ error: "Error al obtener review del quiz" });
  }
});

export default router;