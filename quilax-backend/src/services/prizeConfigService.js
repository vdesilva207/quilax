/**
 * Prize config + quiz-end distribution.
 * All quizDistribution percentages are shares of the TOTAL pot and must sum to 100%.
 */
import prisma from '../lib/prisma.js';

/** Default: 5% jackpot + 5% platform + 10% creator + 80% winners = 100% */
export const DEFAULT_PRIZE_CONFIG = {
  quizDistribution: {
    adminJackpotPercentage: 5,
    adminProfitPercentage: 5,
    creatorPercentage: 10,
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 40 },
      { fromPosition: 2, toPosition: 2, percentage: 20 },
      { fromPosition: 3, toPosition: 3, percentage: 12 },
      { fromPosition: 4, toPosition: 10, percentage: 8 },
    ],
  },
  seasonJackpotDistribution: {
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 30 },
      { fromPosition: 2, toPosition: 2, percentage: 20 },
      { fromPosition: 3, toPosition: 3, percentage: 15 },
      { fromPosition: 4, toPosition: 4, percentage: 10 },
      { fromPosition: 5, toPosition: 5, percentage: 8 },
      { fromPosition: 6, toPosition: 6, percentage: 7 },
      { fromPosition: 7, toPosition: 7, percentage: 5 },
      { fromPosition: 8, toPosition: 8, percentage: 5 },
    ],
  },
  minPrizePool: 10,
};

function deepMergePrizeConfig(base, override) {
  if (!override || typeof override !== 'object') return { ...base };
  return {
    ...base,
    ...override,
    quizDistribution: {
      ...base.quizDistribution,
      ...(override.quizDistribution || {}),
      positionRules:
        override.quizDistribution?.positionRules ||
        base.quizDistribution.positionRules,
    },
    seasonJackpotDistribution: {
      ...base.seasonJackpotDistribution,
      ...(override.seasonJackpotDistribution || {}),
      positionRules:
        override.seasonJackpotDistribution?.positionRules ||
        base.seasonJackpotDistribution.positionRules,
    },
  };
}

export async function getPrizeConfig() {
  try {
    const settings = await prisma.systemSettings.findFirst();
    if (settings?.prizeConfig) {
      return deepMergePrizeConfig(DEFAULT_PRIZE_CONFIG, settings.prizeConfig);
    }
    return { ...DEFAULT_PRIZE_CONFIG };
  } catch (error) {
    console.error('Error getting prize config:', error);
    return { ...DEFAULT_PRIZE_CONFIG };
  }
}

export async function updatePrizeConfig(adminUserId, config) {
  const validatedConfig = validatePrizeConfig(config);

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {
      prizeConfig: validatedConfig,
      updatedAt: new Date(),
    },
    create: {
      id: 1,
      prizeConfig: validatedConfig,
      maxQuizzesPerMinute: 1,
      maxQuizzesPerHour: 60,
      defaultMaxPointsPerQuestion: 1000,
      pointsDecayPerSecond: 10,
    },
  });

  console.log(`✅ Prize config updated by admin ${adminUserId}`);

  return {
    success: true,
    config: validatedConfig,
    message: 'Configuración de premios actualizada exitosamente',
  };
}

/** Alias used by prizeConfig routes */
export async function updateQuizDistribution(adminUserId, quizDistribution) {
  const current = await getPrizeConfig();
  return updatePrizeConfig(adminUserId, {
    ...current,
    quizDistribution: {
      ...current.quizDistribution,
      ...quizDistribution,
    },
  });
}

function validatePrizeConfig(config) {
  const validated = deepMergePrizeConfig(DEFAULT_PRIZE_CONFIG, config);
  const qd = validated.quizDistribution;

  const quizTotal =
    Number(qd.adminJackpotPercentage) +
    Number(qd.adminProfitPercentage) +
    Number(qd.creatorPercentage) +
    (qd.positionRules || []).reduce((sum, rule) => sum + Number(rule.percentage || 0), 0);

  if (Math.abs(quizTotal - 100) > 0.01) {
    throw new Error(`El reparto de quizzes debe sumar 100% (actual: ${quizTotal}%)`);
  }

  for (const rule of qd.positionRules || []) {
    if (!rule.fromPosition || !rule.toPosition || rule.percentage == null) {
      throw new Error('Cada regla de posición debe tener fromPosition, toPosition y percentage');
    }
    if (rule.fromPosition < 1 || rule.toPosition < rule.fromPosition) {
      throw new Error('Las posiciones deben ser válidas');
    }
  }

  const seasonTotal = (validated.seasonJackpotDistribution.positionRules || []).reduce(
    (sum, rule) => sum + Number(rule.percentage || 0),
    0
  );
  if (Math.abs(seasonTotal - 100) > 0.01) {
    throw new Error(`El reparto de jackpot de temporada debe sumar 100% (actual: ${seasonTotal}%)`);
  }

  if (validated.minPrizePool < 1) {
    throw new Error('El prize pool mínimo debe ser al menos 1 crédito');
  }

  return validated;
}

/**
 * Build ranking list from scores (preferred) or participants by score.
 */
async function loadRanking(quizRunId) {
  const quizRun = await prisma.quizRun.findUnique({
    where: { id: quizRunId },
    include: {
      quiz: {
        include: {
          creator: { select: { id: true, email: true, username: true } },
        },
      },
      scores: {
        orderBy: { score: 'desc' },
        include: {
          user: { select: { id: true, email: true, username: true, fullName: true } },
        },
      },
      participants: {
        where: { status: { not: 'DISCONNECTED' } },
        orderBy: { score: 'desc' },
        include: {
          user: { select: { id: true, email: true, username: true, fullName: true } },
        },
      },
    },
  });

  if (!quizRun) throw new Error('Quiz run no encontrado');

  let ranking = (quizRun.scores || []).map((s) => ({
    userId: s.userId,
    score: s.score,
    user: s.user,
  }));

  if (ranking.length === 0) {
    ranking = (quizRun.participants || []).map((p) => ({
      userId: p.userId,
      score: p.score ?? 0,
      user: p.user,
    }));
  }

  return { quizRun, ranking };
}

/**
 * All percentages are of the TOTAL pot (same model as admin panel).
 */
export async function calculateQuizPrizeDistribution(quizRunId) {
  const config = await getPrizeConfig();
  const { quizRun, ranking } = await loadRanking(quizRunId);
  const totalPrizePool = Number(quizRun.totalPrizeCredits) || 0;

  if (totalPrizePool < config.minPrizePool) {
    throw new Error(
      `Prize pool insuficiente. Mínimo requerido: ${config.minPrizePool} créditos`
    );
  }

  const qd = config.quizDistribution;
  const distribution = {
    totalPrizePool,
    adminJackpot: Math.floor(totalPrizePool * (qd.adminJackpotPercentage / 100)),
    adminProfit: Math.floor(totalPrizePool * (qd.adminProfitPercentage / 100)),
    creatorPrize: Math.floor(totalPrizePool * (qd.creatorPercentage / 100)),
    winners: [],
    totalDistributed: 0,
    quizId: quizRun.quizId,
    creatorId: quizRun.quiz?.creatorId || quizRun.quiz?.creator?.id || null,
  };

  const rules = qd.positionRules || [];
  const participantCount = ranking.length;
  let undistributedPercentage = 0;

  for (const rule of rules) {
    const { fromPosition, toPosition, percentage } = rule;
    if (fromPosition > participantCount) {
      undistributedPercentage += Number(percentage);
      continue;
    }
    const actualTo = Math.min(toPosition, participantCount);
    const positionCount = toPosition - fromPosition + 1;
    const individualPercentage = Number(percentage) / positionCount;

    for (let position = fromPosition; position <= actualTo; position++) {
      const row = ranking[position - 1];
      if (!row) continue;
      const prizeAmount = Math.floor(totalPrizePool * (individualPercentage / 100));
      distribution.winners.push({
        userId: row.userId,
        position,
        percentage: individualPercentage,
        creditsWon: prizeAmount,
        user: row.user,
      });
      distribution.totalDistributed += prizeAmount;
    }

    // Unfilled slots inside a range (e.g. toPosition=10 but only 5 players)
    if (actualTo < toPosition) {
      const missing = toPosition - actualTo;
      undistributedPercentage += individualPercentage * missing;
    }
  }

  // Unfilled prize shares → half to #1, half to creator
  if (undistributedPercentage > 0) {
    const redistrib = Math.floor(totalPrizePool * (undistributedPercentage / 100));
    const half = Math.floor(redistrib / 2);
    if (distribution.winners.length > 0 && half > 0) {
      distribution.winners[0].creditsWon += half;
      distribution.winners[0].percentage += undistributedPercentage / 2;
      distribution.totalDistributed += half;
    }
    distribution.creatorPrize += redistrib - half;
  }

  distribution.totalDistributed +=
    distribution.adminJackpot + distribution.adminProfit + distribution.creatorPrize;

  // Floor leftovers → season jackpot bucket (via leftover field; credited in distributePrizes)
  distribution.leftover = Math.max(0, totalPrizePool - distribution.totalDistributed);
  if (distribution.leftover > 0) {
    distribution.adminJackpot += distribution.leftover;
    distribution.totalDistributed += distribution.leftover;
    distribution.leftover = 0;
  }

  return distribution;
}

/**
 * Preview for quiz detail FE — same global rules as live payout.
 */
export async function buildGlobalPrizePreview(totalPrizeCredits = 0) {
  const config = await getPrizeConfig();
  const pool = Number(totalPrizeCredits) || 0;
  const qd = config.quizDistribution;
  const positions = [];

  for (const rule of qd.positionRules || []) {
    const count = rule.toPosition - rule.fromPosition + 1;
    const slice = pool * (Number(rule.percentage) / 100);
    const per = Math.floor(slice / count);
    positions.push({
      fromPosition: rule.fromPosition,
      toPosition: rule.toPosition,
      credits: per,
      percentage: rule.percentage,
    });
  }

  return {
    prizePool: pool,
    adminJackpotPercentage: qd.adminJackpotPercentage,
    adminProfitPercentage: qd.adminProfitPercentage,
    creatorPercentage: qd.creatorPercentage,
    positions,
    source: 'global',
  };
}

export async function calculateSeasonJackpotDistribution(seasonId) {
  const config = await getPrizeConfig();
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      users: {
        orderBy: { points: 'desc' },
        include: {
          user: { select: { id: true, email: true } },
        },
      },
    },
  });

  if (!season) throw new Error('Temporada no encontrada');

  const totalJackpot = season.jackpotPool || 0;
  const distribution = { totalJackpot, winners: [], totalDistributed: 0 };
  const rules = config.seasonJackpotDistribution.positionRules;
  const participantCount = season.users.length;

  for (const rule of rules) {
    const { fromPosition, toPosition, percentage } = rule;
    if (fromPosition > participantCount) continue;
    const actualTo = Math.min(toPosition, participantCount);
    const positionCount = toPosition - fromPosition + 1;
    const individualPercentage = percentage / positionCount;

    for (let position = fromPosition; position <= actualTo; position++) {
      const ranking = season.users[position - 1];
      if (!ranking) continue;
      const prizeAmount = Math.floor(totalJackpot * (individualPercentage / 100));
      distribution.winners.push({
        userId: ranking.userId,
        position,
        percentage: individualPercentage,
        creditsWon: prizeAmount,
        user: ranking.user,
      });
      distribution.totalDistributed += prizeAmount;
    }
  }

  distribution.leftover = totalJackpot - distribution.totalDistributed;
  return distribution;
}

const SEASON_DURATION_DAYS = 90;

export async function getCurrentSeason() {
  const now = new Date();
  return prisma.season.findFirst({
    where: { startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: 'desc' },
  });
}

export async function getAllSeasons() {
  const now = new Date();
  const seasons = await prisma.season.findMany({ orderBy: { startsAt: 'desc' } });
  return {
    current: seasons.find((s) => s.startsAt <= now && s.endsAt >= now),
    past: seasons.filter((s) => s.endsAt < now),
    future: seasons.filter((s) => s.startsAt > now),
  };
}

export async function updateSeason(seasonId, updates) {
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error('Temporada no encontrada');
  const now = new Date();
  if (season.startsAt <= now) {
    throw new Error('Solo se pueden editar temporadas futuras');
  }
  return prisma.season.update({ where: { id: seasonId }, data: updates });
}

export async function ensureSeasonsExist() {
  const now = new Date();
  let currentSeason = await getCurrentSeason();

  if (!currentSeason) {
    const seasonCount = await prisma.season.count();
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SEASON_DURATION_DAYS);
    currentSeason = await prisma.season.create({
      data: {
        name: `Temporada ${seasonCount + 1}`,
        startsAt: startDate,
        endsAt: endDate,
        jackpotPool: 0,
      },
    });
  }

  const daysUntilEnd = Math.ceil((currentSeason.endsAt - now) / (1000 * 60 * 60 * 24));
  if (daysUntilEnd <= 7) {
    const seasonCount = await prisma.season.count();
    const nextStartDate = new Date(currentSeason.endsAt);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextEndDate.getDate() + SEASON_DURATION_DAYS);
    const existingNextSeason = await prisma.season.findFirst({
      where: { startsAt: nextStartDate },
    });
    if (!existingNextSeason) {
      await prisma.season.create({
        data: {
          name: `Temporada ${seasonCount + 1}`,
          startsAt: nextStartDate,
          endsAt: nextEndDate,
          jackpotPool: 0,
        },
      });
    }
  }

  return currentSeason;
}

export async function updateSeasonJackpotDistribution(adminUserId, seasonJackpotDistribution) {
  const current = await getPrizeConfig();
  return updatePrizeConfig(adminUserId, {
    ...current,
    seasonJackpotDistribution: {
      ...current.seasonJackpotDistribution,
      ...seasonJackpotDistribution,
    },
  });
}

export async function getPrizeStatistics(userId = null) {
  const winnerWhere = userId ? { userId: Number(userId) } : {};

  const [totalQuizzes, totalPrizePool, totalDistributed, totalWinners, recentDistributions] =
    await Promise.all([
      prisma.quizRun.count({ where: { phase: 'FINISHED' } }),
      prisma.quizRun.aggregate({
        where: { phase: 'FINISHED' },
        _sum: { totalPrizeCredits: true },
      }),
      prisma.quizWinner.aggregate({
        where: winnerWhere,
        _sum: { creditsWon: true },
      }),
      prisma.quizWinner.count({ where: winnerWhere }),
      prisma.quizWinner.findMany({
        where: winnerWhere,
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, username: true } },
          quiz: { select: { id: true, title: true } },
        },
      }),
    ]);

  const config = await getPrizeConfig();
  const poolSum = totalPrizePool._sum.totalPrizeCredits || 0;
  const wonSum = totalDistributed._sum.creditsWon || 0;

  const statistics = {
    totalQuizzes,
    totalPrizePool: poolSum,
    totalDistributed: wonSum,
    totalWinners,
    averagePrizePerQuiz: totalQuizzes > 0 ? Math.floor(poolSum / totalQuizzes) : 0,
    averagePrizePerWinner: totalWinners > 0 ? Math.floor(wonSum / totalWinners) : 0,
    recentDistributions,
    // Alias used by /prizes/recent-winners
    recentWinners: recentDistributions,
    userId: userId ? Number(userId) : null,
  };

  return {
    config,
    statistics,
    // Flat fields for routes that treat the return value as the stats object
    ...statistics,
  };
}

export { validatePrizeConfig };
