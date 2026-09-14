import prisma from '../lib/prisma.js';
import { getIO } from '../socket.js';
import {
  calculateQuizPrizeDistribution,
  getCurrentSeason,
  ensureSeasonsExist,
} from './prizeConfigService.js';

const MIN_PRIZE_POOL = 10;

/**
 * Distribute prizes automatically when a quiz finishes.
 * Uses global admin prize config (same as panel "Reparto Quiz").
 */
export async function distributePrizes(quizRunId) {
  const quizRun = await prisma.quizRun.findUnique({
    where: { id: quizRunId },
    include: {
      quiz: { select: { id: true, title: true, creatorId: true } },
      participants: { select: { userId: true } },
    },
  });

  if (!quizRun) throw new Error('Quiz run no encontrado');
  if (quizRun.phase !== 'FINISHED') throw new Error('El quiz no ha terminado');
  if (quizRun.totalPrizeCredits < MIN_PRIZE_POOL) {
    throw new Error('Prize pool insuficiente para distribuir');
  }

  const existingWinners = await prisma.quizWinner.count({ where: { quizRunId } });
  if (existingWinners > 0) {
    throw new Error('Los premios ya fueron distribuidos');
  }

  const distribution = await calculateQuizPrizeDistribution(quizRunId);
  const creatorId = distribution.creatorId || quizRun.quiz.creatorId;

  let season = null;
  try {
    season = await getCurrentSeason();
    if (!season) season = await ensureSeasonsExist();
  } catch (e) {
    console.warn('season lookup for jackpot:', e?.message || e);
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdWinners = [];

    for (const winner of distribution.winners) {
      if (!winner.creditsWon || winner.creditsWon <= 0) continue;

      const createdWinner = await tx.quizWinner.create({
        data: {
          quizId: quizRun.quizId,
          quizRunId,
          userId: winner.userId,
          percent: winner.percentage,
          creditsWon: winner.creditsWon,
          type: 'TOP',
        },
      });

      await tx.user.update({
        where: { id: winner.userId },
        data: { balance: { increment: winner.creditsWon } },
      });

      await tx.transaction.create({
        data: {
          userId: winner.userId,
          quizId: quizRun.quizId,
          type: 'PRIZE_PAYOUT',
          amount: winner.creditsWon,
          currency: 'CREDITS',
        },
      });

      createdWinners.push({
        ...createdWinner,
        position: winner.position,
        user: winner.user,
      });
    }

    if (distribution.creatorPrize > 0 && creatorId) {
      await tx.user.update({
        where: { id: creatorId },
        data: { balance: { increment: distribution.creatorPrize } },
      });
      await tx.transaction.create({
        data: {
          userId: creatorId,
          quizId: quizRun.quizId,
          type: 'PRIZE_PAYOUT',
          amount: distribution.creatorPrize,
          currency: 'CREDITS',
        },
      });
    }

    if (distribution.adminJackpot > 0) {
      if (season?.id) {
        await tx.season.update({
          where: { id: season.id },
          data: { jackpotPool: { increment: distribution.adminJackpot } },
        });
      }
      await tx.transaction.create({
        data: {
          type: 'PLATFORM_FEE',
          amount: distribution.adminJackpot,
          currency: 'CREDITS',
          quizId: quizRun.quizId,
        },
      });
    }

    if (distribution.adminProfit > 0) {
      await tx.transaction.create({
        data: {
          type: 'PLATFORM_FEE',
          amount: distribution.adminProfit,
          currency: 'CREDITS',
          quizId: quizRun.quizId,
        },
      });
    }

    return {
      winners: createdWinners,
      creatorPrize: distribution.creatorPrize,
      adminJackpot: distribution.adminJackpot,
      adminProfit: distribution.adminProfit,
      totalDistributed: distribution.totalDistributed,
      totalPrizePool: distribution.totalPrizePool,
    };
  });

  await notifyPrizeDistribution(quizRun, result);
  console.log(`✅ Prizes distributed for quiz run ${quizRunId}:`, {
    winners: result.winners.length,
    creatorPrize: result.creatorPrize,
    adminJackpot: result.adminJackpot,
  });
  return result;
}

async function notifyPrizeDistribution(quizRun, distribution) {
  try {
    const io = getIO();

    for (const winner of distribution.winners) {
      io.to(`user:${winner.userId}`).emit('prize:won', {
        quizId: quizRun.quizId,
        quizRunId: quizRun.id,
        creditsWon: winner.creditsWon,
        position: winner.position,
        message: `¡Felicidades! Has ganado ${winner.creditsWon} créditos`,
      });
    }

    if (distribution.creatorPrize > 0 && quizRun.quiz?.creatorId) {
      io.to(`user:${quizRun.quiz.creatorId}`).emit('prize:creator', {
        quizId: quizRun.quizId,
        quizRunId: quizRun.id,
        creditsWon: distribution.creatorPrize,
      });
    }

    for (const p of quizRun.participants || []) {
      io.to(`user:${p.userId}`).emit('quiz:finished', {
        quizId: quizRun.quizId,
        quizRunId: quizRun.id,
        totalWinners: distribution.winners.length,
        totalPrizePool: quizRun.totalPrizeCredits,
      });
    }

    io.to(`quiz-${quizRun.id}`).emit('prize:distributed', {
      quizRunId: quizRun.id,
      winners: distribution.winners.map((w) => ({
        userId: w.userId,
        position: w.position,
        creditsWon: w.creditsWon,
      })),
      totalDistributed: distribution.totalDistributed,
    });
  } catch (err) {
    console.error('notifyPrizeDistribution:', err?.message || err);
  }
}

export async function getQuizWinners(quizRunId) {
  return prisma.quizWinner.findMany({
    where: { quizRunId },
    include: {
      user: { select: { id: true, email: true, fullName: true, username: true } },
    },
    orderBy: { creditsWon: 'desc' },
  });
}

export async function getPendingPrizeDistributions() {
  const finished = await prisma.quizRun.findMany({
    where: { phase: 'FINISHED' },
    include: {
      quiz: { select: { id: true, title: true } },
    },
    orderBy: { finishedAt: 'desc' },
    take: 50,
  });
  const runIds = finished.map((r) => r.id);
  const paid = await prisma.quizWinner.findMany({
    where: { quizRunId: { in: runIds } },
    select: { quizRunId: true },
    distinct: ['quizRunId'],
  });
  const paidSet = new Set(paid.map((p) => p.quizRunId));
  return finished.filter((r) => !paidSet.has(r.id));
}

export default {
  distributePrizes,
  getQuizWinners,
  getPendingPrizeDistributions,
};
