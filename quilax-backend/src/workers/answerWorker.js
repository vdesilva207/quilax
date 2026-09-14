import { Worker } from "bullmq";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";
import {
  applyAbsoluteRedisScore,
  markAnswerProcessed,
} from "../services/quizScoreSync.js";

const worker = new Worker(
  "answers",
  async (job) => {
    const {
      quizRunId,
      questionId,
      userId,
      answer,
      isCorrect,
      score,
      responseTimeMs,
    } = job.data;

    try {
      // Idempotent: skip duplicate answer rows on job retry
      const existingAnswer = await prisma.quizRunAnswer.findFirst({
        where: { quizRunId, questionId, userId },
        select: { id: true },
      });
      if (!existingAnswer) {
        await prisma.quizRunAnswer.create({
          data: {
            quizRunId,
            questionId,
            userId,
            answer,
            isCorrect,
            score,
            responseTimeMs,
          },
        });
      }

      // Absolute score from Redis (source of truth) — never double-increment after finish flush
      const applied = await applyAbsoluteRedisScore(quizRunId, userId);
      if (applied == null) {
        // Redis miss fallback (should be rare): preserve prior increment behaviour for this job only
        const now = new Date();
        const gain = Number(score) || 0;
        if (gain !== 0) {
          const existing = await prisma.quizScore.findUnique({
            where: { quizRunId_userId: { quizRunId, userId } },
            select: { score: true },
          });
          if (existing) {
            await prisma.quizScore.update({
              where: { quizRunId_userId: { quizRunId, userId } },
              data: { score: { increment: gain }, lastAnswerAt: now },
            });
          } else {
            const participant = await prisma.quizParticipant.findUnique({
              where: { quizRunId_userId: { quizRunId, userId } },
              select: { score: true },
            });
            const seed = Number(participant?.score) || 0;
            await prisma.quizScore.create({
              data: {
                quizRunId,
                userId,
                score: seed + gain,
                lastAnswerAt: now,
              },
            });
          }
          await prisma.quizParticipant.updateMany({
            where: { quizRunId, userId },
            data: { score: { increment: gain } },
          });
        } else {
          await prisma.quizScore.updateMany({
            where: { quizRunId, userId },
            data: { lastAnswerAt: now },
          });
        }
      }
    } finally {
      await markAnswerProcessed(quizRunId);
    }
  },
  {
    connection: redis,
    concurrency: process.env.DEV_LIGHT_WORKERS === "true" ? 4 : 50,
  }
);

worker.on("failed", (job, err) => {
  console.error("answerWorker failed:", job?.id, err?.message || err);
});

console.log("🔥 Answer worker running");
