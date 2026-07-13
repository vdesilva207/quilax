import prisma from "../lib/prisma.js";
import { calculateMaxCredits } from "./quizCredits.js";
import { getIO } from "../socket.js";
import { distributePrizes } from "../services/prizeDistributionService.js";

/**
 * Distribuye los créditos finales de un QuizRun (versión mejorada)
 */
export async function distributeQuizCredits(quizRunId) {
  try {
    console.log(`🏆 Starting prize distribution for quiz run ${quizRunId}`);
    
    // Usar el sistema de premios completo
    const distribution = await distributePrizes(quizRunId);
    
    console.log(`✅ Prize distribution completed for quiz run ${quizRunId}:`, distribution);
    
    return distribution;
  } catch (error) {
    console.error(`❌ Error distributing prizes for quiz run ${quizRunId}:`, error);
    
    // Si falla la distribución automática, registrar el error
    await prisma.quizRun.update({
      where: { id: quizRunId },
      data: {
        // Podríamos añadir un campo para marcar error de distribución
      }
    });
    
    throw error;
  }
}

/**
 * Versión legacy para compatibilidad (usa el sistema antiguo)
 */
export async function distributeQuizCreditsLegacy(quizRunId) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.quizRun.findUnique({
      where: { id: quizRunId },
      include: {
        quiz: { include: { rewardRules: true } },
        participants: {
          orderBy: { finalPosition: "asc" },
        },
      },
    });

    if (!run) throw new Error("QuizRun not found");

    const totalPrizePool = run.participants.length * 1;

    const preview = await calculateMaxCredits(
      run.quiz.id,
      totalPrizePool
    );

    let totalDistributed = 0;

    // ===== REPARTO =====
    for (const rule of preview) {
      if (rule.type === "POSITION") {
        for (let pos = rule.from; pos <= rule.to; pos++) {
          const participant = run.participants[pos - 1];
          if (!participant) continue;

          await tx.quizWinner.create({
            data: {
              quizId: run.quiz.id,
              quizRunId,
              userId: participant.userId,
              creditsWon: rule.creditsPerWinner,
              percent: (rule.creditsPerWinner / totalPrizePool) * 100,
              type: "TOP",
            },
          });

          await tx.user.update({
            where: { id: participant.userId },
            data: {
              balance: { // Usar balance en lugar de credits
                increment: rule.creditsPerWinner,
              },
            },
          });

          // Registrar transacción
          await tx.transaction.create({
            data: {
              userId: participant.userId,
              quizId: run.quiz.id,
              type: "PRIZE_PAYOUT",
              amount: rule.creditsPerWinner,
              currency: "CREDITS",
            },
          });

          totalDistributed += rule.creditsPerWinner;
        }
      }

      if (rule.type === "CREATOR" && run.quiz.creatorId) {
        await tx.user.update({
          where: { id: run.quiz.creatorId },
          data: {
            balance: {
              increment: rule.creditsPerWinner,
            },
          },
        });

        // Registrar transacción del creador
        await tx.transaction.create({
          data: {
            userId: run.quiz.creatorId,
            quizId: run.quiz.id,
            type: "PRIZE_PAYOUT",
            amount: rule.creditsPerWinner,
            currency: "CREDITS",
          },
        });

        totalDistributed += rule.creditsPerWinner;
      }

      if (rule.type === "ADMIN") {
        const adminUser = await tx.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (adminUser) {
          await tx.user.update({
            where: { id: adminUser.id },
            data: {
              balance: {
                increment: rule.creditsPerWinner,
              },
            },
          });

          // Registrar transacción del admin
          await tx.transaction.create({
            data: {
              type: "PLATFORM_FEE",
              amount: rule.creditsPerWinner,
              currency: "CREDITS",
            },
          });

          totalDistributed += rule.creditsPerWinner;
        }
      }
    }

    // ===== JACKPOT DEL 5% PARA ADMIN =====
    const adminJackpot = Math.floor(totalPrizePool * 0.05);
    if (adminJackpot > 0) {
      const adminUser = await tx.user.findFirst({
        where: { role: "ADMIN" },
      });

      if (adminUser) {
        await tx.user.update({
          where: { id: adminUser.id },
          data: {
            balance: {
              increment: adminJackpot,
            },
          },
        });

        await tx.transaction.create({
          data: {
            type: "PLATFORM_FEE",
            amount: adminJackpot,
            currency: "CREDITS",
          },
        });

        totalDistributed += adminJackpot;
      }
    }

    // ===== SOBRANTE =====
    let leftover = totalPrizePool - totalDistributed;

    if (leftover > 0) {
      if (run.quiz.creatorId) {
        await tx.user.update({
          where: { id: run.quiz.creatorId },
          data: {
            balance: {
              increment: leftover,
            },
          },
        });
      } else {
        const adminUser = await tx.user.findFirst({
          where: { role: "ADMIN" },
        });

        if (adminUser) {
          await tx.user.update({
            where: { id: adminUser.id },
            data: {
              balance: {
                increment: leftover,
              },
            },
          });
        }
      }

      totalDistributed += leftover;
      leftover = 0;
    }

    // Notificar via Socket.IO
    const io = getIO();
    io.to(`quiz-${quizRunId}`).emit("prize:distributed", {
      quizRunId,
      totalPrizePool,
      totalDistributed,
      message: "Premios distribuidos exitosamente"
    });

    return {
      totalPrizePool,
      totalDistributed,
      leftover,
    };
  });
}


