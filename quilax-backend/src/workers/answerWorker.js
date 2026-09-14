import { Worker } from "bullmq";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

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
          data: {
            score: { increment: gain },
            lastAnswerAt: now,
          },
        });
      } else {
        // Preserve early-join seed from participant if QuizScore row was missing
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
  },
  {
    connection: redis,
    concurrency: process.env.DEV_LIGHT_WORKERS === "true" ? 4 : 50,
  }
);

console.log("🔥 Answer worker running");
