import prisma from "../lib/prisma.js";

export async function distributeRewards(runId) {
  // 1. RUN
  const run = await prisma.quizRun.findUnique({
    where: { id: runId },
    include: {
      quiz: true,
    },
  });

  if (!run) throw new Error("Run no encontrado");

  // 2. evitar doble reparto
  const alreadyDistributed = await prisma.quizWinner.findFirst({
    where: {
      quizRunId: runId,
    },
  });

  if (alreadyDistributed) {
    throw new Error("Rewards ya distribuidos");
  }

  // 3. PARTICIPANTES
  const participants = await prisma.quizParticipant.findMany({
    where: { quizRunId: runId },
  });

  if (participants.length === 0) {
    throw new Error("No hay participantes");
  }

  // 4. RESPUESTAS
  const answers = await prisma.quizRunAnswer.findMany({
    where: { quizRunId: runId },
  });

  // 5. SCORES
  const scores = {};

  for (const a of answers) {
    if (!scores[a.userId]) scores[a.userId] = 0;
    scores[a.userId] += a.score;
  }

  // jugadores sin respuestas → score 0
  for (const p of participants) {
    if (!scores[p.userId]) scores[p.userId] = 0;
  }

  const ranking = Object.entries(scores)
    .map(([userId, score]) => ({
      userId: Number(userId),
      score,
    }))
    .sort((a, b) => b.score - a.score);

  // 6. POOL
  const CREDIT_PER_JOIN = 1;
  const totalPrizeCredits = participants.length * CREDIT_PER_JOIN;

  // 7. REGLAS
  const rules = await prisma.rewardRule.findMany({
    where: { quizId: run.quizId },
  });

  let totalPercent = 0;
  for (const r of rules) {
    totalPercent += Number(r.percent);
  }

  if (totalPercent > 100) {
    throw new Error("Las reward rules superan 100%");
  }

  const round = (v) => Math.round(v * 100) / 100;

  // 8. DISTRIBUCIÓN
  for (const rule of rules) {
    const percent = Number(rule.percent);
    const amount = round(totalPrizeCredits * (percent / 100));

    // 🏆 POSITION
    if (rule.type === "POSITION") {
      const from = rule.positionFrom;
      const to = rule.positionTo;

      if (from == null || to == null) continue;

      const winners = ranking.slice(from - 1, to);
      if (winners.length === 0) continue;

      const perUser = round(amount / winners.length);

      for (const w of winners) {
        // 💰 TRANSACCIÓN
        await prisma.transaction.create({
          data: {
            user: {
              connect: { id: w.userId },
            },
            quiz: {
              connect: { id: run.quizId },
            },
            amount: perUser,
            type: "PRIZE_PAYOUT",
            currency: "CREDITS",
          },
        });

        // 🏆 WINNER
        await prisma.quizWinner.create({
          data: {
            quizId: run.quizId,
            quizRunId: runId,
            userId: w.userId,
            percent,
            creditsWon: perUser,
            type: "TOP",
          },
        });
      }
    }

    // 👤 CREATOR
    if (rule.type === "CREATOR") {
      await prisma.transaction.create({
        data: {
          user: {
            connect: { id: run.quiz.creatorId },
          },
          quiz: {
            connect: { id: run.quizId },
          },
          amount,
          type: "PRIZE_PAYOUT",
          currency: "CREDITS",
        },
      });

      await prisma.quizWinner.create({
        data: {
          quizId: run.quizId,
          quizRunId: runId,
          userId: run.quiz.creatorId,
          percent,
          creditsWon: amount,
          type: "TOP",
        },
      });
    }

    // 🏦 ADMIN (JACKPOT SIMULADO)
    if (rule.type === "ADMIN") {
      // ⚠️ En tu schema NO existe sistema real → lo dejamos sin user
      await prisma.transaction.create({
        data: {
          amount,
          type: "PLATFORM_FEE", // 👈 esto SÍ existe en enum
          currency: "CREDITS",
          quiz: {
            connect: { id: run.quizId },
          },
        },
      });

      // opcional: guardar como winner técnico
      await prisma.quizWinner.create({
        data: {
          quizId: run.quizId,
          quizRunId: runId,
          userId: run.quiz.creatorId, // 👈 fallback temporal
          percent,
          creditsWon: amount,
          type: "TOP",
        },
      });
    }
  }

  return {
    ok: true,
    totalPrizeCredits,
    players: participants.length,
    distributed: true,
  };
}