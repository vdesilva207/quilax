import { Worker } from "bullmq";
import prisma from "../lib/prisma.js";
import redis from "../lib/redis.js";

const worker = new Worker(
  "answers", // 🔥 mismo nombre que la queue
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

    if (score > 0) {
      await prisma.quizScore.update({
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
  },
  {
    connection: redis,
    concurrency: 200
  }
);

console.log("🔥 Answer worker running");