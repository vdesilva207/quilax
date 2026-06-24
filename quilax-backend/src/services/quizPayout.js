import prisma from "../lib/prisma.js";

/**
 * Reparte premios reales al finalizar un QuizRun
 */
export async function payoutQuizRun(quizRunId) {
  const run = await prisma.quizRun.findUnique({
    where: { id: quizRunId },
    include: {
      quiz: { include: { rewardRules: true } },
      scores: {
        orderBy: { score: "desc" },
      },
    },
  });

  if (!run) throw new Error("QuizRun not found");

  if (run.phase === "FINISHED")
    throw new Error("Quiz already finished");

  const totalPrize = run.totalPrizeCredits;

  await prisma.$transaction(async (tx) => {
    for (const rule of run.quiz.rewardRules) {
      const winnersCount = rule.winnersCount ?? 1;

      // POSITION → ranking
      if (rule.type === "POSITION" && rule.position) {
        for (let i = 0; i < winnersCount; i++) {
          const index = rule.position - 1 + i;
          const score = run.scores[index];
          if (!score) continue;

          const credits =
            (rule.percent / 100) * totalPrize;

          await tx.quizWinner.create({
            data: {
              quizId: run.quizId,
              userId: score.userId,
              percent: rule.percent,
              creditsWon: credits,
              type: "TOP",
            },
          });

          await tx.transaction.create({
            data: {
              userId: score.userId,
              quizId: run.quizId,
              type: "PRIZE_PAYOUT",
              amount: credits,
              currency: "CREDITS",
            },
          });
        }
      }

      // CREATOR
      if (rule.type === "CREATOR") {
        const credits =
          (rule.percent / 100) * totalPrize;

        await tx.transaction.create({
          data: {
            userId: run.quiz.creatorId,
            quizId: run.quizId,
            type: "PLATFORM_FEE",
            amount: credits,
            currency: "CREDITS",
          },
        });
      }

      // ADMIN
      if (rule.type === "ADMIN") {
        const admin = await tx.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (admin) {
          const credits =
            (rule.percent / 100) * totalPrize;

          await tx.transaction.create({
            data: {
              userId: admin.id,
              quizId: run.quizId,
              type: "PLATFORM_FEE",
              amount: credits,
              currency: "CREDITS",
            },
          });
        }
      }
    }

    await tx.quizRun.update({
      where: { id: quizRunId },
      data: { phase: "FINISHED", finishedAt: new Date() },
    });
  });

  return { success: true };
}


if (!run || run.phase !== "FINISHED") {
  throw new Error("Invalid payout state");
}