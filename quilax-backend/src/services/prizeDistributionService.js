import prisma from '../lib/prisma.js';
import { getIO } from '../socket.js';
import { calculateQuizPrizeDistribution } from './prizeConfigService.js';

const MIN_PRIZE_POOL = 10; // Mínimo 10 créditos para distribuir

/*
====================================
DISTRIBUIR PREMIOS AUTOMÁTICAMENTE
====================================
*/
export async function distributePrizes(quizRunId) {
  try {
    // Obtener información del quiz run
    const quizRun = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: {
        quiz: {
          select: { id: true, title: true, creatorId: true }
        },
        quizParticipants: {
          include: {
            user: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!quizRun) {
      throw new Error('Quiz run no encontrado');
    }

    if (quizRun.phase !== 'FINISHED') {
      throw new Error('El quiz no ha terminado');
    }

    if (quizRun.totalPrizeCredits < MIN_PRIZE_POOL) {
      throw new Error('Prize pool insuficiente para distribuir');
    }

    // Verificar si ya se distribuyeron premios
    const existingWinners = await prisma.quizWinner.findMany({
      where: { quizRunId }
    });

    if (existingWinners.length > 0) {
      throw new Error('Los premios ya fueron distribuidos');
    }

    // Calcular distribución usando configuración global
    const distribution = await calculateQuizPrizeDistribution(quizRunId);

    // Ejecutar distribución en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Registrar ganadores
      const createdWinners = [];
      for (const winner of distribution.winners) {
        const createdWinner = await tx.quizWinner.create({
          data: {
            quizId: quizRun.quizId,
            quizRunId,
            userId: winner.userId,
            percent: winner.percentage,
            creditsWon: winner.creditsWon,
            type: 'TOP'
          }
        });

        // Añadir créditos al ganador
        await tx.user.update({
          where: { id: winner.userId },
          data: { balance: { increment: winner.creditsWon } }
        });

        // Registrar transacción
        await tx.transaction.create({
          data: {
            userId: winner.userId,
            quizId: quizRun.quizId,
            type: 'PRIZE_PAYOUT',
            amount: winner.creditsWon,
            currency: 'CREDITS'
          }
        });

        createdWinners.push(createdWinner);
      }

      // Pagar al creador del quiz
      if (distribution.creatorPrize > 0) {
        await tx.user.update({
          where: { id: quizRun.quiz.creatorId },
          data: { balance: { increment: distribution.creatorPrize } }
        });

        await tx.transaction.create({
          data: {
            userId: quizRun.quiz.creatorId,
            quizId: quizRun.quizId,
            type: 'PRIZE_PAYOUT',
            amount: distribution.creatorPrize,
            currency: 'CREDITS'
          }
        });
      }

      // Registrar jackpot del admin (para premios de temporada)
      if (distribution.adminJackpot > 0) {
        await tx.transaction.create({
          data: {
            type: 'JACKPOT_DEPOSIT',
            amount: distribution.adminJackpot,
            currency: 'CREDITS'
          }
        });
      }

      // Registrar beneficios del admin (cuenta principal)
      if (distribution.adminProfit > 0) {
        await tx.transaction.create({
          data: {
            type: 'PLATFORM_FEE',
            amount: distribution.adminProfit,
            currency: 'CREDITS'
          }
        });
      }

      return {
        winners: createdWinners,
        creatorPrize: distribution.creatorPrize,
        adminJackpot: distribution.adminJackpot,
        adminProfit: distribution.adminProfit,
        totalDistributed: distribution.totalDistributed
      };
    });

    // Notificar a todos los participantes
    await notifyPrizeDistribution(quizRun, result);

    console.log(`✅ Prizes distributed for quiz run ${quizRunId}:`, result);
    return result;

  } catch (error) {
    console.error('Error distributing prizes:', error);
    throw error;
  }
}


/*
====================================
NOTIFICAR DISTRIBUCIÓN DE PREMIOS
====================================
*/
async function notifyPrizeDistribution(quizRun, distribution) {
  const io = getIO();

  // Notificar a ganadores
  for (const winner of distribution.winners) {
    io.to(`user:${winner.userId}`).emit('prize:won', {
      quizId: quizRun.quizId,
      quizRunId: quizRun.id,
      creditsWon: winner.creditsWon,
      position: winner.position,
      message: `¡Felicidades! Has ganado ${winner.creditsWon} créditos en el quiz "${quizRun.quiz.title}"`
    });
  }

  // Notificar al creador
  if (distribution.creatorPrize > 0) {
    io.to(`user:${quizRun.quiz.creatorId}`).emit('prize:creator', {
      quizId: quizRun.quizId,
      quizRunId: quizRun.id,
      creditsWon: distribution.creatorPrize,
      message: `Tu quiz ha generado ${distribution.creatorPrize} créditos en comisión`
    });
  }

  // Notificar a todos los participantes
  const participantIds = quizRun.quizParticipants.map(p => p.userId);
  for (const participantId of participantIds) {
    io.to(`user:${participantId}`).emit('quiz:finished', {
      quizId: quizRun.quizId,
      quizRunId: quizRun.id,
      totalWinners: distribution.winners.length,
      totalPrizePool: quizRun.totalPrizeCredits,
      message: `El quiz "${quizRun.quiz.title}" ha finalizado. ¡Revisa los resultados!`
    });
  }

  // Broadcast general del quiz
  io.to(`quiz-${quizRun.id}`).emit('prize:distributed', {
    quizRunId: quizRun.id,
    winners: distribution.winners.map(w => ({
      userId: w.userId,
      position: w.position,
      creditsWon: w.creditsWon,
      fullName: w.user?.email || 'Usuario'
    })),
    totalDistributed: distribution.totalDistributed,
    message: 'Premios distribuidos exitosamente'
  });
}

/*
====================================
OBTENER GANADORES DE UN QUIZ
====================================
*/
export async function getQuizWinners(quizRunId) {
  const winners = await prisma.quizWinner.findMany({
    where: { quizRunId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true
        }
      }
    },
    orderBy: { percent: 'desc' }
  });

  return winners;
}

/*
====================================
OBTENER ESTADÍSTICAS DE PREMIOS
====================================
*/
export async function getPrizeStatistics(userId = null) {
  const whereClause = userId ? { userId } : {};

  const [totalPrizes, totalWinners, totalAmount, recentWinners] = await Promise.all([
    prisma.quizWinner.count({ where: whereClause }),
    prisma.quizWinner.groupBy({
      by: ['userId'],
      where: whereClause
    }),
    prisma.quizWinner.aggregate({
      where: whereClause,
      _sum: { creditsWon: true }
    }),
    prisma.quizWinner.findMany({
      where: whereClause,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        quiz: {
          select: {
            title: true
          }
        }
      }
    })
  ]);

  return {
    totalPrizes,
    totalWinners: totalWinners.length,
    totalAmountDistributed: totalAmount._sum.creditsWon || 0,
    averagePrize: totalWinners.length > 0 ? Math.floor((totalAmount._sum.creditsWon || 0) / totalWinners.length) : 0,
    recentWinners
  };
}

/*
====================================
VERIFICAR SI HAY PREMIOS PENDIENTES
====================================
*/
export async function getPendingPrizeDistributions() {
  const pendingQuizzes = await prisma.quizRun.findMany({
    where: {
      phase: 'FINISHED',
      totalPrizeCredits: { gte: MIN_PRIZE_POOL }
    },
    include: {
      quiz: {
        include: {
          winners: {
            select: { id: true }
          }
        }
      }
    }
  });

  // Filtrar quizzes que no tienen ganadores registrados
  const pendingDistributions = pendingQuizzes.filter(quiz => 
    quiz.quiz.winners.length === 0
  );

  return pendingDistributions;
}

export default {
  distributePrizes,
  getQuizWinners,
  getPrizeStatistics,
  getPendingPrizeDistributions
};
