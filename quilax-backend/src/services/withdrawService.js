import Stripe from 'stripe';
import prisma from '../lib/prisma.js';
import { getIO } from '../socket.js';
import { detectSuspiciousTransaction, markTransactionAsSuspicious } from './suspiciousTransactionService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configuración de fees
const WITHDRAW_FEE_FIXED = 0.50; // 0.50 EUR fijo
const WITHDRAW_FEE_PERCENTAGE = 0.02; // 2% del monto
const MIN_WITHDRAW_AMOUNT = 5; // Mínimo 5 EUR
const WITHDRAW_SCHEDULE_HOURS = 24; // Horas entre retiros fraccionados

/*
====================================
SOLICITAR RETIRO DE PREMIOS
====================================
*/
export async function createWithdrawRequest(userId, amount) {
  try {
    // Obtener configuración de límites
    const settings = await prisma.systemSettings.findFirst();
    const maxWithdrawPerTransaction = settings?.maxWithdrawPerTransaction || 50000;
    const maxWithdrawPerMonth = settings?.maxWithdrawPerMonth || 200000;

    // Validar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        bankAccountIban: true,
        bankAccountName: true,
        bankAccountBic: true,
        isBankVerified: true,
        isOver18: true,
        largePrizeVerified: true
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validaciones
    if (!user.isOver18) {
      throw new Error('Debes ser mayor de 18 años para retirar fondos');
    }

    if (!user.isBankVerified || !user.bankAccountIban) {
      throw new Error('Debes tener una cuenta bancaria verificada');
    }

    if (user.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    if (amount < MIN_WITHDRAW_AMOUNT) {
      throw new Error(`El monto mínimo de retiro es ${MIN_WITHDRAW_AMOUNT} EUR`);
    }

    // Verificar límite mensual
    const currentMonthWithdraws = await prisma.withdraw.findMany({
      where: {
        userId,
        status: { in: ['REQUESTED', 'PROCESSING', 'COMPLETED'] },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      },
      select: { amount: true }
    });

    const monthlyTotal = currentMonthWithdraws.reduce((sum, w) => sum + w.amount, 0);
    if (monthlyTotal + amount > maxWithdrawPerMonth) {
      throw new Error(`Has superado el límite mensual de retiros. Puedes retirar hasta ${maxWithdrawPerMonth - monthlyTotal} EUR este mes.`);
    }

    // Calcular fee
    const processingFee = Math.max(WITHDRAW_FEE_FIXED, amount * WITHDRAW_FEE_PERCENTAGE);
    const totalAmount = amount + processingFee;

    // Verificar si requiere retiro fraccionado
    const requiresFractionation = amount > maxWithdrawPerTransaction;
    
    if (requiresFractionation) {
      return await createFractionatedWithdraws(userId, amount, maxWithdrawPerTransaction, user);
    }

    // Verificar si hay retiro pendiente
    const existingWithdraw = await prisma.withdraw.findFirst({
      where: {
        userId,
        status: { in: ['REQUESTED', 'PROCESSING'] }
      }
    });

    if (existingWithdraw) {
      throw new Error('Ya tienes un retiro en proceso');
    }

    // Crear solicitud de retiro simple y procesar automáticamente
    const withdraw = await prisma.$transaction(async (tx) => {
      // Descontar saldo del usuario
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } }
      });

      // Registrar transacción
      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: -amount,
          currency: 'EUR'
        }
      });

      // Detectar transacción sospechosa
      const suspicious = await detectSuspiciousTransaction(userId, amount, 'WITHDRAW');
      if (suspicious.isSuspicious) {
        await markTransactionAsSuspicious(transaction.id, suspicious.reasons);
      }

      // Crear retiro con estado PROCESSING (se procesa automáticamente)
      return await tx.withdraw.create({
        data: {
          userId,
          amount,
          currency: 'EUR',
          status: 'PROCESSING',
          bankAccountIban: user.bankAccountIban,
          bankAccountName: user.bankAccountName,
          processingFee: Math.round(processingFee * 100) // Convertir a centavos
        }
      });
    });

    // Procesar automáticamente con Stripe
    try {
      await processWithdrawRequest(withdraw.id);
    } catch (error) {
      // Si falla el procesamiento, marcar como fallido
      await prisma.withdraw.update({
        where: { id: withdraw.id },
        data: {
          status: 'REJECTED',
          failureReason: error.message
        }
      });

      // Devolver saldo al usuario
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } }
        });

        await tx.transaction.create({
          data: {
            userId,
            type: 'WITHDRAW',
            amount: amount,
            currency: 'EUR'
          }
        });
      });

      throw error;
    }

    // Notificar al usuario
    const io = getIO();
    io.to(`user:${userId}`).emit('withdraw:requested', {
      amount,
      processingFee,
      totalAmount,
      message: `Solicitud de retiro de ${amount} EUR recibida. Procesando...`
    });

    return {
      withdraw,
      processingFee,
      totalAmount,
      estimatedTime: '1-3 días hábiles',
      fractionated: false
    };

  } catch (error) {
    console.error('Error creating withdraw request:', error);
    throw error;
  }
}

/*
====================================
CREAR RETIROS FRACCIONADOS AUTOMÁTICOS
====================================
*/
async function createFractionatedWithdraws(userId, totalAmount, maxPerTransaction, user) {
  // Calcular número de retiros necesarios
  const numWithdraws = Math.ceil(totalAmount / maxPerTransaction);
  const withdrawAmounts = [];
  
  for (let i = 0; i < numWithdraws; i++) {
    if (i === numWithdraws - 1) {
      // Último retiro con el resto
      withdrawAmounts.push(totalAmount - (maxPerTransaction * (numWithdraws - 1)));
    } else {
      withdrawAmounts.push(maxPerTransaction);
    }
  }

  // Verificar límite mensual para todos los retiros fraccionados
  const settings = await prisma.systemSettings.findFirst();
  const maxWithdrawPerMonth = settings?.maxWithdrawPerMonth || 200000;

  const currentMonthWithdraws = await prisma.withdraw.findMany({
    where: {
      userId,
      status: { in: ['REQUESTED', 'PROCESSING', 'COMPLETED'] },
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    },
    select: { amount: true }
  });

  const monthlyTotal = currentMonthWithdraws.reduce((sum, w) => sum + w.amount, 0);
  if (monthlyTotal + totalAmount > maxWithdrawPerMonth) {
    throw new Error(`El monto total excede tu límite mensual. Puedes retirar hasta ${maxWithdrawPerMonth - monthlyTotal} EUR este mes.`);
  }

  // Crear retiros fraccionados
  const withdraws = [];
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Descontar saldo total del usuario
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: totalAmount } }
    });

    // Registrar transacción total
    const transaction = await tx.transaction.create({
      data: {
        userId,
        type: 'WITHDRAW',
        amount: -totalAmount,
        currency: 'EUR'
      }
    });

    // Detectar transacción sospechosa
    const suspicious = await detectSuspiciousTransaction(userId, totalAmount, 'WITHDRAW');
    if (suspicious.isSuspicious) {
      await markTransactionAsSuspicious(transaction.id, suspicious.reasons);
    }

    // Crear retiro principal
    const parentWithdraw = await tx.withdraw.create({
      data: {
        userId,
        amount: totalAmount,
        currency: 'EUR',
        status: 'PROCESSING',
        bankAccountIban: user.bankAccountIban,
        bankAccountName: user.bankAccountName,
        processingFee: 0, // No se cobra fee en el retiro principal
        isPartOfSeries: true
      }
    });

    // Crear retiros individuales programados
    for (let i = 0; i < withdrawAmounts.length; i++) {
      const scheduledFor = new Date(now.getTime() + (i * WITHDRAW_SCHEDULE_HOURS * 60 * 60 * 1000));
      const processingFee = Math.max(WITHDRAW_FEE_FIXED, withdrawAmounts[i] * WITHDRAW_FEE_PERCENTAGE);

      const withdraw = await tx.withdraw.create({
        data: {
          userId,
          amount: withdrawAmounts[i],
          currency: 'EUR',
          status: i === 0 ? 'PROCESSING' : 'REQUESTED', // Primer retiro se procesa inmediato, resto programado
          bankAccountIban: user.bankAccountIban,
          bankAccountName: user.bankAccountName,
          processingFee: Math.round(processingFee * 100),
          parentWithdrawId: parentWithdraw.id,
          isPartOfSeries: true,
          seriesIndex: i + 1,
          scheduledFor: i === 0 ? null : scheduledFor
        }
      });

      withdraws.push(withdraw);
    }
  });

  // Procesar automáticamente el primer retiro de la serie
  try {
    await processWithdrawRequest(withdraws[0].id);
  } catch (error) {
    // Si falla el primer retiro, marcar todos como fallidos
    await prisma.withdraw.updateMany({
      where: { parentWithdrawId: parentWithdraw.id },
      data: {
        status: 'REJECTED',
        failureReason: error.message
      }
    });

    // Devolver saldo al usuario
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: totalAmount } }
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'WITHDRAW',
          amount: totalAmount,
          currency: 'EUR'
        }
      });
    });

    throw error;
  }

  // Notificar al usuario sobre el plan de retiros fraccionados
  const io = getIO();
  io.to(`user:${userId}`).emit('withdraw:fractionated', {
    totalAmount,
    numWithdraws,
    withdrawAmounts,
    message: `Tu retiro de ${totalAmount} EUR se dividirá en ${numWithdraws} retiros de ${withdrawAmounts.join(', ')} EUR. El primer retiro se procesará ahora, el resto cada ${WITHDRAW_SCHEDULE_HOURS} horas.`
  });

  return {
    withdraws,
    totalAmount,
    numWithdraws,
    fractionated: true,
    estimatedTime: `${numWithdraws * WITHDRAW_SCHEDULE_HOURS} horas (retiros fraccionados)`
  };
}

/*
====================================
PROCESAR RETIRO CON STRIPE
====================================
*/
export async function processWithdrawRequest(withdrawId) {
  try {
    const withdraw = await prisma.withdraw.findUnique({
      where: { id: withdrawId },
      include: {
        user: {
          select: {
            email: true
          }
        }
      }
    });

    if (!withdraw) {
      throw new Error('Retiro no encontrado');
    }

    if (withdraw.status !== 'REQUESTED') {
      throw new Error('Retiro ya procesado');
    }

    // Actualizar estado a PROCESSING
    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: { status: 'PROCESSING' }
    });

    // Crear cliente Stripe
    const customer = await stripe.customers.create({
      email: withdraw.user.email,
      metadata: {
        userId: withdraw.userId.toString()
      }
    });

    // Crear cuenta externa para el retiro
    const externalAccount = await stripe.customers.createSource(
      customer.id,
      {
        external_account: {
          object: 'bank_account',
          country: 'ES', // Asumir España por ahora
          currency: 'eur',
          account_number: withdraw.bankAccountIban.replace(/\s/g, ''),
          account_holder_name: withdraw.bankAccountName,
        }
      }
    );

    // Crear payout de Stripe
    const payout = await stripe.payouts.create({
      amount: Math.round(withdraw.amount * 100), // Convertir a centavos
      currency: 'eur',
      method: 'instant',
      destination: externalAccount.id,
      metadata: {
        withdrawId: withdrawId.toString(),
        userId: withdraw.userId.toString()
      }
    });

    // Actualizar retiro con ID de payout
    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: {
        status: 'COMPLETED',
        stripePayoutId: payout.id,
        processedAt: new Date()
      }
    });

    // Notificar éxito
    const io = getIO();
    io.to(`user:${withdraw.userId}`).emit('withdraw:completed', {
      amount: withdraw.amount,
      payoutId: payout.id,
      message: `Retiro de ${withdraw.amount} EUR procesado exitosamente`
    });

    console.log(`✅ Withdraw completed: User ${withdraw.userId}, Amount ${withdraw.amount}, Payout ${payout.id}`);

    return { success: true, payout };

  } catch (error) {
    // Marcar como fallido
    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: {
        status: 'REJECTED',
        failureReason: error.message
      }
    });

    // Devolver saldo al usuario
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: (await prisma.withdraw.findUnique({ where: { id: withdrawId } })).userId },
        data: { balance: { increment: (await prisma.withdraw.findUnique({ where: { id: withdrawId } })).amount } }
      });

      await tx.transaction.create({
        data: {
          userId: (await prisma.withdraw.findUnique({ where: { id: withdrawId } })).userId,
          type: 'WITHDRAW',
          amount: (await prisma.withdraw.findUnique({ where: { id: withdrawId } })).amount,
          currency: 'EUR'
        }
      });
    });

    // Notificar error
    const io = getIO();
    const withdraw = await prisma.withdraw.findUnique({ where: { id: withdrawId } });
    io.to(`user:${withdraw.userId}`).emit('withdraw:failed', {
      amount: withdraw.amount,
      error: error.message,
      message: 'El retiro ha fallado. El monto ha sido devuelto a tu cuenta.'
    });

    console.error(`❌ Withdraw failed: User ${withdraw.userId}, Error: ${error.message}`);
    throw error;
  }
}

/*
====================================
OBTENER HISTORIAL DE RETIROS
====================================
*/
export async function getUserWithdrawHistory(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [withdraws, total] = await Promise.all([
    prisma.withdraw.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        processingFee: true,
        failureReason: true,
        createdAt: true,
        processedAt: true
      }
    }),
    prisma.withdraw.count({ where: { userId } })
  ]);

  return {
    withdraws,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/*
====================================
OBTENER RETIROS PENDIENTES (ADMIN)
====================================
*/
export async function getPendingWithdraws(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [withdraws, total] = await Promise.all([
    prisma.withdraw.findMany({
      where: { status: 'REQUESTED' },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isBankVerified: true
          }
        }
      }
    }),
    prisma.withdraw.count({ where: { status: 'REQUESTED' } })
  ]);

  return {
    withdraws,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/*
====================================
APROBAR/RECHAZAR RETIRO (ADMIN)
====================================
*/
export async function updateWithdrawStatus(withdrawId, status, reason = null) {
  try {
    const withdraw = await prisma.withdraw.findUnique({
      where: { id: withdrawId },
      select: { userId: true, amount: true, status: true }
    });

    if (!withdraw) {
      throw new Error('Retiro no encontrado');
    }

    if (withdraw.status !== 'REQUESTED') {
      throw new Error('Retiro ya procesado');
    }

    if (status === 'COMPLETED') {
      return await processWithdrawRequest(withdrawId);
    }

    if (status === 'REJECTED') {
      await prisma.withdraw.update({
        where: { id: withdrawId },
        data: {
          status: 'REJECTED',
          failureReason: reason || 'Rechazado por administrador'
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
            type: 'WITHDRAW',
            amount: withdraw.amount,
            currency: 'EUR'
          }
        });
      });

      // Notificar rechazo
      const io = getIO();
      io.to(`user:${withdraw.userId}`).emit('withdraw:rejected', {
        amount: withdraw.amount,
        reason: reason || 'Rechazado por administrador',
        message: 'Tu solicitud de retiro ha sido rechazada. El monto ha sido devuelto a tu cuenta.'
      });

      return { success: true, message: 'Retiro rechazado' };
    }

    throw new Error('Estado no válido');

  } catch (error) {
    console.error('Error updating withdraw status:', error);
    throw error;
  }
}

export default {
  createWithdrawRequest,
  processWithdrawRequest,
  getUserWithdrawHistory,
  getPendingWithdraws,
  updateWithdrawStatus
};
