import prisma from '../lib/prisma.js';

const SEASON_DURATION_DAYS = 90;

// Configuración por defecto del sistema de premios
const DEFAULT_PRIZE_CONFIG = {
  // Reparto de premios de quizzes (aplica a TODOS los quizzes)
  quizDistribution: {
    adminJackpotPercentage: 5.0, // 5% para el admin (cuenta jackpot de temporada)
    adminProfitPercentage: 5.0, // 5% para el admin (cuenta principal de admin/beneficios)
    creatorPercentage: 10.0, // 10% para el creador (cuenta del creador del quiz)
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 40 }, // 1er lugar: 40%
      { fromPosition: 2, toPosition: 2, percentage: 25 }, // 2do lugar: 25%
      { fromPosition: 3, toPosition: 3, percentage: 15 }, // 3er lugar: 15%
      { fromPosition: 4, toPosition: 4, percentage: 5 }, // 4to lugar: 5%
    ]
  },
  // Reparto de jackpot de temporada (aplica a TODAS las temporadas)
  seasonJackpotDistribution: {
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 30 }, // 1er lugar: 30%
      { fromPosition: 2, toPosition: 2, percentage: 20 }, // 2do lugar: 20%
      { fromPosition: 3, toPosition: 3, percentage: 15 }, // 3er lugar: 15%
      { fromPosition: 4, toPosition: 4, percentage: 10 }, // 4to lugar: 10%
      { fromPosition: 5, toPosition: 5, percentage: 8 }, // 5to lugar: 8%
      { fromPosition: 6, toPosition: 6, percentage: 7 }, // 6to lugar: 7%
      { fromPosition: 7, toPosition: 7, percentage: 5 }, // 7to lugar: 5%
      { fromPosition: 8, toPosition: 8, percentage: 5 }, // 8vo lugar: 5%
    ]
  },
  minPrizePool: 10, // Mínimo 10 créditos
};

/*
====================================
OBTENER CONFIGURACIÓN DE PREMIOS
====================================
*/
export async function getPrizeConfig() {
  try {
    // Buscar configuración guardada en SystemSettings
    const settings = await prisma.systemSettings.findFirst();
    
    if (settings && settings.prizeConfig) {
      return {
        ...DEFAULT_PRIZE_CONFIG,
        ...settings.prizeConfig
      };
    }
    
    return DEFAULT_PRIZE_CONFIG;
  } catch (error) {
    console.error('Error getting prize config:', error);
    return DEFAULT_PRIZE_CONFIG;
  }
}

/*
====================================
ACTUALIZAR CONFIGURACIÓN DE PREMIOS (ADMIN)
====================================
*/
export async function updatePrizeConfig(adminUserId, config) {
  try {
    // Validar configuración
    const validatedConfig = validatePrizeConfig(config);
    
    // Guardar en SystemSettings
    const settings = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        prizeConfig: validatedConfig,
        updatedAt: new Date()
      },
      create: {
        prizeConfig: validatedConfig,
        maxQuizzesPerMinute: 1,
        maxQuizzesPerHour: 60,
        defaultMaxPointsPerQuestion: 1000,
        pointsDecayPerSecond: 10
      }
    });
    
    // Registrar acción del admin
    await prisma.transaction.create({
      data: {
        userId: adminUserId,
        type: 'PLATFORM_FEE',
        amount: 0,
        currency: 'CREDITS',
        // Aquí podríamos añadir metadata sobre la configuración
      }
    });
    
    console.log(`✅ Prize config updated by admin ${adminUserId}:`, validatedConfig);
    
    return {
      success: true,
      config: validatedConfig,
      message: 'Configuración de premios actualizada exitosamente'
    };
    
  } catch (error) {
    console.error('Error updating prize config:', error);
    throw new Error(`Error al actualizar configuración: ${error.message}`);
  }
}

/*
====================================
VALIDAR CONFIGURACIÓN DE PREMIOS
====================================
*/
function validatePrizeConfig(config) {
  const validated = { ...DEFAULT_PRIZE_CONFIG, ...config };

  // Validar reparto de quizzes
  if (validated.quizDistribution) {
    const quizTotal = validated.quizDistribution.adminJackpotPercentage +
                     validated.quizDistribution.adminProfitPercentage +
                     validated.quizDistribution.creatorPercentage +
                     validated.quizDistribution.positionRules.reduce((sum, rule) => sum + rule.percentage, 0);

    if (Math.abs(quizTotal - 100) > 0.01) {
      throw new Error(`El reparto de quizzes debe sumar 100% (actual: ${quizTotal}%)`);
    }

    if (validated.quizDistribution.adminJackpotPercentage < 0 || validated.quizDistribution.adminJackpotPercentage > 50) {
      throw new Error('El porcentaje del jackpot del admin en quizzes debe estar entre 0% y 50%');
    }

    if (validated.quizDistribution.adminProfitPercentage < 0 || validated.quizDistribution.adminProfitPercentage > 50) {
      throw new Error('El porcentaje de beneficios del admin en quizzes debe estar entre 0% y 50%');
    }

    if (validated.quizDistribution.creatorPercentage < 0 || validated.quizDistribution.creatorPercentage > 50) {
      throw new Error('El porcentaje del creador en quizzes debe estar entre 0% y 50%');
    }

    // Validar reglas de posición
    for (const rule of validated.quizDistribution.positionRules) {
      if (!rule.fromPosition || !rule.toPosition || !rule.percentage) {
        throw new Error('Cada regla de posición debe tener fromPosition, toPosition y percentage');
      }
      if (rule.fromPosition < 1 || rule.toPosition < rule.fromPosition) {
        throw new Error('Las posiciones deben ser válidas (fromPosition >= 1, toPosition >= fromPosition)');
      }
      if (rule.percentage < 0 || rule.percentage > 100) {
        throw new Error('El porcentaje de cada regla debe estar entre 0% y 100%');
      }
    }
  }

  // Validar reparto de jackpot de temporada
  if (validated.seasonJackpotDistribution) {
    const seasonTotal = validated.seasonJackpotDistribution.positionRules.reduce((sum, rule) => sum + rule.percentage, 0);

    if (Math.abs(seasonTotal - 100) > 0.01) {
      throw new Error(`El reparto de jackpot de temporada debe sumar 100% (actual: ${seasonTotal}%)`);
    }

    // Validar reglas de posición
    for (const rule of validated.seasonJackpotDistribution.positionRules) {
      if (!rule.fromPosition || !rule.toPosition || !rule.percentage) {
        throw new Error('Cada regla de posición debe tener fromPosition, toPosition y percentage');
      }
      if (rule.fromPosition < 1 || rule.toPosition < rule.fromPosition) {
        throw new Error('Las posiciones deben ser válidas (fromPosition >= 1, toPosition >= fromPosition)');
      }
      if (rule.percentage < 0 || rule.percentage > 100) {
        throw new Error('El porcentaje de cada regla debe estar entre 0% y 100%');
      }
    }
  }

  // Validar montos mínimos
  if (validated.minPrizePool < 1) {
    throw new Error('El prize pool mínimo debe ser al menos 1 crédito');
  }

  return validated;
}

/*
====================================
CALCULAR DISTRIBUCIÓN DE PREMIOS DE QUIZ
====================================
*/
export async function calculateQuizPrizeDistribution(quizRunId) {
  try {
    const config = await getPrizeConfig();

    // Obtener información del quiz run
    const quizRun = await prisma.quizRun.findUnique({
      where: { id: quizRunId },
      include: {
        quiz: {
          include: {
            creator: {
              select: { id: true, email: true }
            }
          }
        },
        quizScores: {
          orderBy: { score: 'desc' },
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    if (!quizRun) {
      throw new Error('Quiz run no encontrado');
    }

    const totalPrizePool = quizRun.totalPrizeCredits;

    if (totalPrizePool < config.minPrizePool) {
      throw new Error(`Prize pool insuficiente. Mínimo requerido: ${config.minPrizePool} créditos`);
    }

    // Calcular distribuciones usando configuración global de quizzes
    const distribution = {
      totalPrizePool,
      adminJackpot: Math.floor(totalPrizePool * (config.quizDistribution.adminJackpotPercentage / 100)),
      adminProfit: Math.floor(totalPrizePool * (config.quizDistribution.adminProfitPercentage / 100)),
      creatorPrize: Math.floor(totalPrizePool * (config.quizDistribution.creatorPercentage / 100)),
      winners: [],
      totalDistributed: 0,
      quizId: quizRun.quiz.id
    };

    // Usar siempre las reglas globales de quizzes
    const rules = config.quizDistribution.positionRules;

    // Distribuir premios por posición
    const availableForWinners = totalPrizePool - distribution.adminJackpot - distribution.adminProfit - distribution.creatorPrize;
    const participantCount = quizRun.quizScores.length;

    // Calcular la posición máxima premiada
    const maxPrizePosition = rules.reduce((max, rule) => Math.max(max, rule.toPosition), 0);

    // Calcular porcentaje no distribuido por falta de jugadores
    let undistributedPercentage = 0;

    for (const rule of rules) {
      const { fromPosition, toPosition, percentage } = rule;

      // Si el rango de posiciones está dentro de los participantes
      if (fromPosition <= participantCount) {
        const actualToPosition = Math.min(toPosition, participantCount);

        for (let position = fromPosition; position <= actualToPosition; position++) {
          const score = quizRun.quizScores[position - 1];
          if (!score) continue;

          // Calcular porcentaje individual para esta posición
          const positionCount = toPosition - fromPosition + 1;
          const individualPercentage = percentage / positionCount;
          const prizeAmount = Math.floor(availableForWinners * (individualPercentage / 100));

          distribution.winners.push({
            userId: score.userId,
            position,
            percentage: individualPercentage,
            creditsWon: prizeAmount,
            user: score.user
          });

          distribution.totalDistributed += prizeAmount;
        }
      } else {
        // Este rango no tiene participantes, añadir al porcentaje no distribuido
        undistributedPercentage += percentage;
      }
    }

    // Redistribuir el porcentaje no distribuido entre el primer lugar y el creador
    if (undistributedPercentage > 0 && distribution.winners.length > 0) {
      const redistributionAmount = Math.floor(availableForWinners * (undistributedPercentage / 100));
      const halfRedistribution = Math.floor(redistributionAmount / 2);

      // Añadir al primer lugar
      distribution.winners[0].creditsWon += halfRedistribution;
      distribution.winners[0].percentage += (undistributedPercentage / 2);
      distribution.totalDistributed += halfRedistribution;

      // Añadir al creador
      distribution.creatorPrize += halfRedistribution;
    }

    // Añadir comisiones al total distribuido
    distribution.totalDistributed += distribution.adminJackpot + distribution.adminProfit + distribution.creatorPrize;

    // Calcular sobrante
    distribution.leftover = totalPrizePool - distribution.totalDistributed;

    return distribution;

  } catch (error) {
    console.error('Error calculating quiz prize distribution:', error);
    throw error;
  }
}

/*
====================================
CALCULAR DISTRIBUCIÓN DE JACKPOT DE TEMPORADA
====================================
*/
export async function calculateSeasonJackpotDistribution(seasonId) {
  try {
    const config = await getPrizeConfig();

    // Obtener información de la temporada
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        seasonRankings: {
          orderBy: { points: 'desc' },
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        }
      }
    });

    if (!season) {
      throw new Error('Temporada no encontrada');
    }

    const totalJackpot = season.jackpotPool;

    // Calcular distribuciones usando configuración global de temporadas
    const distribution = {
      totalJackpot,
      winners: [],
      totalDistributed: 0
    };

    // Usar siempre las reglas globales de temporadas
    const rules = config.seasonJackpotDistribution.positionRules;

    // Distribuir premios por posición (todo el jackpot va a los usuarios)
    const availableForWinners = totalJackpot;
    const participantCount = season.seasonRankings.length;

    for (const rule of rules) {
      const { fromPosition, toPosition, percentage } = rule;

      // Si el rango de posiciones está dentro de los participantes
      if (fromPosition <= participantCount) {
        const actualToPosition = Math.min(toPosition, participantCount);

        for (let position = fromPosition; position <= actualToPosition; position++) {
          const ranking = season.seasonRankings[position - 1];
          if (!ranking) continue;

          // Calcular porcentaje individual para esta posición
          const positionCount = toPosition - fromPosition + 1;
          const individualPercentage = percentage / positionCount;
          const prizeAmount = Math.floor(availableForWinners * (individualPercentage / 100));

          distribution.winners.push({
            userId: ranking.userId,
            position,
            percentage: individualPercentage,
            creditsWon: prizeAmount,
            user: ranking.user
          });

          distribution.totalDistributed += prizeAmount;
        }
      }
    }

    // Calcular sobrante
    distribution.leftover = totalJackpot - distribution.totalDistributed;

    return distribution;

  } catch (error) {
    console.error('Error calculating season jackpot distribution:', error);
    throw error;
  }
}

/*
====================================
GESTIÓN DE TEMPORADAS
====================================
*/
export async function getCurrentSeason() {
  const now = new Date();
  return await prisma.season.findFirst({
    where: {
      startsAt: { lte: now },
      endsAt: { gte: now }
    },
    orderBy: { startsAt: 'desc' }
  });
}

export async function getAllSeasons() {
  const now = new Date();
  const seasons = await prisma.season.findMany({
    orderBy: { startsAt: 'desc' }
  });

  return {
    current: seasons.find(s => s.startsAt <= now && s.endsAt >= now),
    past: seasons.filter(s => s.endsAt < now),
    future: seasons.filter(s => s.startsAt > now)
  };
}

export async function updateSeason(seasonId, updates) {
  const season = await prisma.season.findUnique({
    where: { id: seasonId }
  });

  if (!season) {
    throw new Error('Temporada no encontrada');
  }

  const now = new Date();
  if (season.startsAt <= now) {
    throw new Error('Solo se pueden editar temporadas futuras');
  }

  return await prisma.season.update({
    where: { id: seasonId },
    data: updates
  });
}

export async function ensureSeasonsExist() {
  const now = new Date();
  let currentSeason = await getCurrentSeason();

  // Si no hay temporada actual, crear la primera
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
        jackpotPool: 0
      }
    });
  }

  // Verificar si la temporada actual está terminando y crear la siguiente
  const daysUntilEnd = Math.ceil((currentSeason.endsAt - now) / (1000 * 60 * 60 * 24));
  if (daysUntilEnd <= 7) {
    const seasonCount = await prisma.season.count();
    const nextStartDate = new Date(currentSeason.endsAt);
    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextEndDate.getDate() + SEASON_DURATION_DAYS);

    const existingNextSeason = await prisma.season.findFirst({
      where: { startsAt: nextStartDate }
    });

    if (!existingNextSeason) {
      await prisma.season.create({
        data: {
          name: `Temporada ${seasonCount + 1}`,
          startsAt: nextStartDate,
          endsAt: nextEndDate,
          jackpotPool: 0
        }
      });
    }
  }

  return currentSeason;
}

/*
====================================
ACTUALIZAR CONFIGURACIÓN DE QUIZZES
====================================
*/
export async function updateQuizDistribution(adminUserId, quizDistribution) {
  try {
    // Validar configuración de quizzes
    const validatedConfig = validatePrizeConfig({ quizDistribution });
    
    // Obtener configuración actual
    const settings = await prisma.systemSettings.findFirst();
    const currentConfig = settings && settings.prizeConfig ? settings.prizeConfig : DEFAULT_PRIZE_CONFIG;
    
    // Actualizar configuración de quizzes
    const updatedConfig = {
      ...currentConfig,
      quizDistribution: validatedConfig.quizDistribution
    };
    
    // Guardar en SystemSettings
    await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        prizeConfig: updatedConfig,
        updatedAt: new Date()
      },
      create: {
        prizeConfig: updatedConfig,
        maxQuizzesPerMinute: 1,
        maxQuizzesPerHour: 60,
        defaultMaxPointsPerQuestion: 1000,
        pointsDecayPerSecond: 10
      }
    });
    
    console.log(`✅ Quiz distribution updated by admin ${adminUserId}:`, validatedConfig.quizDistribution);
    
    return {
      success: true,
      config: validatedConfig.quizDistribution,
      message: 'Reparto de quizzes actualizado exitosamente. Aplicará a todos los quizzes futuros.'
    };
    
  } catch (error) {
    console.error('Error updating quiz distribution:', error);
    throw new Error(`Error al actualizar reparto de quizzes: ${error.message}`);
  }
}

/*
====================================
ACTUALIZAR CONFIGURACIÓN DE JACKPOT DE TEMPORADA
====================================
*/
export async function updateSeasonJackpotDistribution(adminUserId, seasonJackpotDistribution) {
  try {
    // Validar configuración de temporadas
    const validatedConfig = validatePrizeConfig({ seasonJackpotDistribution });
    
    // Obtener configuración actual
    const settings = await prisma.systemSettings.findFirst();
    const currentConfig = settings && settings.prizeConfig ? settings.prizeConfig : DEFAULT_PRIZE_CONFIG;
    
    // Actualizar configuración de temporadas
    const updatedConfig = {
      ...currentConfig,
      seasonJackpotDistribution: validatedConfig.seasonJackpotDistribution
    };
    
    // Guardar en SystemSettings
    await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {
        prizeConfig: updatedConfig,
        updatedAt: new Date()
      },
      create: {
        prizeConfig: updatedConfig,
        maxQuizzesPerMinute: 1,
        maxQuizzesPerHour: 60,
        defaultMaxPointsPerQuestion: 1000,
        pointsDecayPerSecond: 10
      }
    });
    
    console.log(`✅ Season jackpot distribution updated by admin ${adminUserId}:`, validatedConfig.seasonJackpotDistribution);
    
    return {
      success: true,
      config: validatedConfig.seasonJackpotDistribution,
      message: 'Reparto de jackpot de temporada actualizado exitosamente. Aplicará a todas las temporadas futuras.'
    };
    
  } catch (error) {
    console.error('Error updating season jackpot distribution:', error);
    throw new Error(`Error al actualizar reparto de jackpot de temporada: ${error.message}`);
  }
}

/*
====================================
OBTENER ESTADÍSTICAS DE PREMIOS
====================================
*/
export async function getPrizeStatistics() {
  try {
    const [
      totalQuizzes,
      totalPrizePool,
      totalDistributed,
      totalWinners,
      recentDistributions
    ] = await Promise.all([
      prisma.quizRun.count({
        where: { phase: 'FINISHED' }
      }),
      prisma.quizRun.aggregate({
        where: { phase: 'FINISHED' },
        _sum: { totalPrizeCredits: true }
      }),
      prisma.quizWinner.aggregate({
        _sum: { creditsWon: true }
      }),
      prisma.quizWinner.count(),
      prisma.quizWinner.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true }
          },
          quiz: {
            select: { title: true }
          }
        }
      })
    ]);
    
    const config = await getPrizeConfig();
    
    return {
      config,
      statistics: {
        totalQuizzes,
        totalPrizePool: totalPrizePool._sum.totalPrizeCredits || 0,
        totalDistributed: totalDistributed._sum.creditsWon || 0,
        totalWinners,
        averagePrizePerQuiz: totalQuizzes > 0 ? Math.floor((totalPrizePool._sum.totalPrizeCredits || 0) / totalQuizzes) : 0,
        averagePrizePerWinner: totalWinners > 0 ? Math.floor((totalDistributed._sum.creditsWon || 0) / totalWinners) : 0,
        recentDistributions
      }
    };
    
  } catch (error) {
    console.error('Error getting prize statistics:', error);
    throw error;
  }
}

export default {
  getPrizeConfig,
  updatePrizeConfig,
  calculateQuizPrizeDistribution,
  calculateSeasonJackpotDistribution,
  updateQuizDistribution,
  updateSeasonJackpotDistribution,
  getPrizeStatistics
};
