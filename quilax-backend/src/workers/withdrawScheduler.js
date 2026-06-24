import prisma from "../lib/prisma.js";
import { processWithdrawRequest } from "../services/withdrawService.js";
import { getIO } from "../socket.js";

let schedulerInterval = null;

/**
 * Iniciar el scheduler de retiros programados
 */
export function startWithdrawScheduler() {
  if (schedulerInterval) {
    console.log("⚠️ Withdraw scheduler already running");
    return;
  }

  console.log("🔄 Starting withdraw scheduler...");

  // Temporarily disabled to prevent DB connection errors during development
  // Ejecutar cada 5 minutos
  // schedulerInterval = setInterval(async () => {
  //   try {
  //     await processScheduledWithdraws();
  //   } catch (error) {
  //     console.error("❌ Error in withdraw scheduler:", error);
  //   }
  // }, 5 * 60 * 1000); // 5 minutos

  console.log("✅ Withdraw scheduler started (runs every 5 minutes) - DISABLED");
}

/**
 * Procesar retiros programados
 */
async function processScheduledWithdraws() {
  const now = new Date();

  // Buscar retiros programados que deben procesarse
  const scheduledWithdraws = await prisma.withdraw.findMany({
    where: {
      status: "REQUESTED",
      scheduledFor: {
        lte: now
      },
      isPartOfSeries: true
    },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  if (scheduledWithdraws.length === 0) {
    return;
  }

  console.log(`📋 Processing ${scheduledWithdraws.length} scheduled withdrawals`);

  for (const withdraw of scheduledWithdraws) {
    try {
      // Verificar si el retiro principal sigue activo
      if (withdraw.parentWithdrawId) {
        const parentWithdraw = await prisma.withdraw.findUnique({
          where: { id: withdraw.parentWithdrawId }
        });

        if (!parentWithdraw || parentWithdraw.status === "REJECTED") {
          // Si el retiro principal fue rechazado, cancelar este también
          await prisma.withdraw.update({
            where: { id: withdraw.id },
            data: {
              status: "REJECTED",
              failureReason: "Retiro principal cancelado"
            }
          });

          // Devolver saldo al usuario
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: withdraw.userId },
              data: { balance: { increment: withdraw.amount } }
            });

            await tx.transaction.create({
              data: {
                userId: withdraw.userId,
                type: "WITHDRAW",
                amount: withdraw.amount,
                currency: "EUR"
              }
            });
          });

          console.log(`❌ Withdraw ${withdraw.id} cancelled (parent rejected)`);
          continue;
        }
      }

      // Procesar el retiro
      await processWithdrawRequest(withdraw.id);

      console.log(`✅ Scheduled withdraw ${withdraw.id} processed successfully`);

      // Notificar al usuario
      const io = getIO();
      io.to(`user:${withdraw.userId}`).emit("withdraw:scheduled-processed", {
        withdrawId: withdraw.id,
        amount: withdraw.amount,
        seriesIndex: withdraw.seriesIndex,
        message: `Tu retiro programado #${withdraw.seriesIndex} de ${withdraw.amount} EUR ha sido procesado.`
      });

    } catch (error) {
      console.error(`❌ Error processing scheduled withdraw ${withdraw.id}:`, error);

      // Marcar como fallido
      await prisma.withdraw.update({
        where: { id: withdraw.id },
        data: {
          status: "REJECTED",
          failureReason: error.message
        }
      });

      // Devolver saldo al usuario
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: withdraw.userId },
          data: { balance: { increment: withdraw.amount } }
        });

        await tx.transaction.create({
          data: {
            userId: withdraw.userId,
            type: "WITHDRAW",
            amount: withdraw.amount,
            currency: "EUR"
          }
        });
      });

      // Notificar error al usuario
      const io = getIO();
      io.to(`user:${withdraw.userId}`).emit("withdraw:scheduled-failed", {
        withdrawId: withdraw.id,
        amount: withdraw.amount,
        seriesIndex: withdraw.seriesIndex,
        error: error.message,
        message: `Tu retiro programado #${withdraw.seriesIndex} ha fallado. El monto ha sido devuelto a tu cuenta.`
      });
    }
  }
}

/**
 * Detener el scheduler de retiros
 */
export function stopWithdrawScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏹️ Withdraw scheduler stopped");
  }
}
