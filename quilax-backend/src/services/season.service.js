import prisma from "../lib/prisma.js";
import { getIO } from "../socket.js";

/**
 * Obtener temporada activa
 */
export async function getActiveSeason() {
  const now = new Date();

  return prisma.season.findFirst({
    where: {
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
  });
}

/**
 * Añadir puntos a temporada
 */
export async function addSeasonPoints(userId, points) {
  const season = await getActiveSeason();

  if (!season) return;

  const seasonUser = await prisma.seasonUser.upsert({
    where: {
      userId_seasonId: {
        userId,
        seasonId: season.id,
      },
    },
    create: {
      userId,
      seasonId: season.id,
      points,
    },
    update: {
      points: { increment: points },
    },
  });

  const io = getIO();

  io.emit("season:ranking:update", {
    userId,
    points: seasonUser.points,
  });

  return seasonUser;
}

/**
 * Obtener ranking temporada
 */
export async function getSeasonRanking(seasonId, limit = 100) {
  return prisma.seasonUser.findMany({
    where: { seasonId },
    orderBy: { points: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Obtener ranking completo (top 2000)
 */
export async function getSeasonTop2000(seasonId) {
  return prisma.seasonUser.findMany({
    where: { seasonId },
    orderBy: { points: "desc" },
    take: 2000,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Calcular distribución del jackpot según posición (1000 premios)
 */
function calculateJackpotDistribution(jackpotTotal, position) {
  if (position <= 10) {
    // Top 10 - Premios élite
    const elitePercentages = [15, 10, 7, 5, 4, 3, 2.5, 2, 1.5, 1];
    return Math.floor(jackpotTotal * (elitePercentages[position - 1] / 100));
  } else if (position <= 20) {
    // Puestos 11-20: 0.8% cada uno
    return Math.floor(jackpotTotal * 0.008);
  } else if (position <= 30) {
    // Puestos 21-30: 0.6% cada uno
    return Math.floor(jackpotTotal * 0.006);
  } else if (position <= 40) {
    // Puestos 31-40: 0.5% cada uno
    return Math.floor(jackpotTotal * 0.005);
  } else if (position <= 50) {
    // Puestos 41-50: 0.4% cada uno
    return Math.floor(jackpotTotal * 0.004);
  } else if (position <= 100) {
    // Puestos 51-100: 0.25% cada uno
    return Math.floor(jackpotTotal * 0.0025);
  } else if (position <= 150) {
    // Puestos 101-150: 0.15% cada uno
    return Math.floor(jackpotTotal * 0.0015);
  } else if (position <= 200) {
    // Puestos 151-200: 0.1% cada uno
    return Math.floor(jackpotTotal * 0.001);
  } else if (position <= 500) {
    // Puestos 201-500: 0.025% cada uno
    return Math.floor(jackpotTotal * 0.00025);
  } else if (position <= 1000) {
    // Puestos 501-1000: 0.01% cada uno
    return Math.floor(jackpotTotal * 0.0001);
  }
  return 0;
}

/**
 * Calcular ganadores temporada con distribución de jackpot
 */
export async function calculateSeasonWinners(seasonId) {
  const ranking = await prisma.seasonUser.findMany({
    where: { seasonId },
    orderBy: { points: "desc" },
    take: 1000,
  });

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { jackpotPool: true },
  });

  const jackpotTotal = season?.jackpotPool || 0;
  const winners = [];

  for (let i = 0; i < ranking.length; i++) {
    const entry = ranking[i];
    const position = i + 1;
    const creditsAwarded = calculateJackpotDistribution(jackpotTotal, position);

    winners.push({
      seasonId,
      userId: entry.userId,
      type: "TOP",
      position,
      points: entry.points,
      creditsAwarded,
      rewardDescription: `Posición ${position} - ${creditsAwarded} créditos`,
    });
  }

  await prisma.seasonWinner.createMany({
    data: winners,
    skipDuplicates: true,
  });

  return winners;
}

/**
 * Crear nueva temporada (90 días)
 */
export async function createNextSeason() {
  const now = new Date();

  const ends = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  return prisma.season.create({
    data: {
      name: `Season ${now.getFullYear()}-${now.getMonth() + 1}`,
      startsAt: now,
      endsAt: ends,
    },
  });
}

/**
 * Cerrar temporada y distribuir premios
 */
export async function closeSeason(seasonId) {
  const winners = await calculateSeasonWinners(seasonId);

  let largePrizeThreshold = 100000;
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.largePrizeThreshold != null) {
      largePrizeThreshold = settings.largePrizeThreshold;
    }
  } catch (err) {
    console.warn(
      "⚠️ systemSettings unavailable, using default largePrizeThreshold=100000",
      err?.message || err
    );
  }

  for (const winner of winners) {
    if (winner.creditsAwarded && winner.creditsAwarded > 0) {
      const requiresEnhancedKyc = winner.creditsAwarded >= largePrizeThreshold;

      await prisma.user.update({
        where: { id: winner.userId },
        data: {
          balance: { increment: winner.creditsAwarded },
        },
      });

      await prisma.transaction.create({
        data: {
          userId: winner.userId,
          type: "PRIZE_PAYOUT",
          amount: winner.creditsAwarded,
          currency: "EUR",
        },
      });

      // User schema has no largePrizeVerified — notify only
      if (requiresEnhancedKyc) {
        await prisma.notification.create({
          data: {
            userId: winner.userId,
            type: "LARGE_PRIZE_VERIFICATION_REQUIRED",
            title: "Verificación requerida para gran premio",
            body: `Has ganado ${winner.creditsAwarded} créditos. Para retirar este premio, necesitamos documentación adicional. Por favor sube los documentos requeridos en Configuración > Ayuda.`,
            data: {
              prizeAmount: winner.creditsAwarded,
              position: winner.position,
            },
          },
        });
      }
    }
  }

  const io = getIO();

  io.emit("season:ended", {
    seasonId,
    winners: winners.slice(0, 10),
  });

  return winners;
}
