import prisma from "../lib/prisma.js";
import { submitAnswer } from "../services/quizEngine.js";
import redis from "../lib/redis.js";

export async function getQuizRunState(req, res) {
  try {
    const quizRunId = Number(req.params.id);

    if (!quizRunId) {
      return res.status(400).json({ error: "Invalid quizRunId" });
    }

    const run = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
    });

    if (!run) {
      return res.status(404).json({ error: "QuizRun not found" });
    }

    res.json({
      quizRunId: run.id,
      phase: run.phase,
      currentIndex: run.currentIndex,
      phaseEndsAt: run.phaseEndsAt,
      totalPrizeCredits: run.totalPrizeCredits,
    });
  } catch (err) {
    console.error("❌ getQuizRunState error", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function answerQuestion(req, res) {
  try {
    const quizRunId = Number(req.params.id);

    if (!quizRunId) {
      return res.status(400).json({ error: "Invalid quizRunId" });
    }

    const { questionId, answer, responseTimeMs } = req.body;

    const userId = req.user?.id;

    if (!userId || !questionId || answer == null) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    // 1️⃣ Lógica real del quiz
    const result = await submitAnswer({
      quizRunId,
      questionId,
      userId,
      answer,
      responseTimeMs,
    });

    // 🚫 si no está permitido (fase incorrecta etc)
    if (!result?.allowed) {
      return res.json(result);
    }

    // 3️⃣ respuesta normal
    res.json(result);
  } catch (err) {
    console.error("❌ answerQuestion error", err);
    res.status(500).json({ error: "Internal server error" });
  }
}