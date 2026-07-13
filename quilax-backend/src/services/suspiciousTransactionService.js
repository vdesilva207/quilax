import prisma from "../lib/prisma.js";
import { getIO } from "../socket.js";

/**
 * Detectar transacciones sospechosas
 */
export async function detectSuspiciousTransaction(userId, amount, type, ipAddress = null) {
  const suspiciousIndicators = [];
  const settings = await prisma.systemSettings.findFirst();
  const largeTransactionThreshold = settings?.largePrizeThreshold || 100000;

  // 1. Transacción muy grande
  if (amount > largeTransactionThreshold) {
    suspiciousIndicators.push(`Transacción grande: ${amount} EUR (threshold: ${largeTransactionThreshold} EUR)`);
  }

  // 2. Múltiples transacciones en corto tiempo (última hora)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: oneHourAgo }
    }
  });

  if (recentTransactions.length >= 5) {
    suspiciousIndicators.push(`Múltiples transacciones en 1 hora: ${recentTransactions.length}`);
  }

  // 3. Retiro inmediato después de depósito grande
  if (type === "WITHDRAW") {
    const recentDeposits = await prisma.transaction.findMany({
      where: {
        userId,
        type: "BANK_TO_CREDITS",
        createdAt: { gte: oneHourAgo }
      }
    });

    if (recentDeposits.length > 0) {
      const totalDeposited = recentDeposits.reduce((sum, t) => sum + t.amount, 0);
      if (totalDeposited > 10000) {
        suspiciousIndicators.push(`Retiro inmediato después de depósito de ${totalDeposited} EUR`);
      }
    }
  }

  // 4. Cambio brusco en patrón de transacciones
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: { gte: oneWeekAgo }
    }
  });

  const avgAmount = weekTransactions.length > 0 
    ? weekTransactions.reduce((sum, t) => sum + t.amount, 0) / weekTransactions.length 
    : 0;

  if (avgAmount > 0 && amount > avgAmount * 10) {
    suspiciousIndicators.push(`Transacción ${amount} EUR es 10x mayor que el promedio (${avgAmount.toFixed(2)} EUR)`);
  }

  // 5. Transacciones desde diferentes IPs (si hay historial)
  if (ipAddress) {
    const recentIPs = await prisma.transaction.findMany({
      where: {
        userId,
        ipAddress: { not: null },
        createdAt: { gte: oneWeekAgo }
      },
      select: { ipAddress: true },
      distinct: ["ipAddress"]
    });

    const uniqueIPs = recentIPs.map(t => t.ipAddress);
    if (uniqueIPs.length >= 5 && !uniqueIPs.includes(ipAddress)) {
      suspiciousIndicators.push(`Nueva IP (${ipAddress}) - Usuario ha usado ${uniqueIPs.length} IPs diferentes`);
    }
  }

  // Si hay indicadores sospechosos, marcar y notificar
  if (suspiciousIndicators.length > 0) {
    return {
      isSuspicious: true,
      reasons: suspiciousIndicators
    };
  }

  return {
    isSuspicious: false,
    reasons: []
  };
}

/**
 * Marcar transacción como sospechosa y notificar a admins
 */
export async function markTransactionAsSuspicious(transactionId, reasons) {
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      isSuspicious: true,
      suspiciousReason: reasons.join("; ")
    }
  });

  // Obtener detalles de la transacción
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      user: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  // Notificar a todos los admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ADMIN_WORKER"] } }
  });

  const io = getIO();
  admins.forEach(admin => {
    io.to(`user:${admin.id}`).emit("suspicious:transaction", {
      transactionId,
      userId: transaction.userId,
      userEmail: transaction.user.email,
      userName: transaction.user.fullName,
      amount: transaction.amount,
      type: transaction.type,
      reasons,
      createdAt: transaction.createdAt
    });
  });

  // Crear notificación para admins
  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: "SUSPICIOUS_TRANSACTION",
        title: "Transacción sospechosa detectada",
        body: `Usuario ${transaction.user.email} realizó una transacción de ${transaction.amount} EUR marcada como sospechosa. Razones: ${reasons.join(", ")}`,
        data: {
          transactionId,
          userId: transaction.userId,
          amount: transaction.amount,
          reasons
        }
      }
    });
  }

  console.log(`⚠️ Suspicious transaction detected: User ${transaction.user.email}, Amount ${transaction.amount}, Reasons: ${reasons.join(", ")}`);
}

/**
 * Obtener transacciones sospechosas (admin)
 */
export async function getSuspiciousTransactions(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { isSuspicious: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    }),
    prisma.transaction.count({ where: { isSuspicious: true } })
  ]);

  return {
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export default {
  detectSuspiciousTransaction,
  markTransactionAsSuspicious,
  getSuspiciousTransactions
};
