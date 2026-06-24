import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

// ============================
// RANKINGS GENERALES
// ============================

// Ranking TOP global
router.get('/top', async (req, res) => {
  try {
    const { 
      period = 'all-time', 
      limit = 50, 
      page = 1,
      category,
      difficulty 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = {};
    
    if (category) {
      where.quiz = {
        category
      };
    }

    if (difficulty) {
      where.quiz = {
        ...where.quiz,
        difficulty: difficulty.toUpperCase()
      };
    }

    // Filtrar por período
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'daily':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = {
          gte: weekAgo
        };
        break;
      case 'monthly':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1)
        };
        break;
      case 'yearly':
        dateFilter = {
          gte: new Date(now.getFullYear(), 0, 1)
        };
        break;
      default:
        // all-time - sin filtro de fecha
        break;
    }

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [rankings, total] = await Promise.all([
      prisma.quizScore.groupBy({
        by: ['userId'],
        where,
        _sum: { score: true },
        _count: { userId: true },
        orderBy: {
          _sum: { score: 'desc' }
        },
        take: parseInt(limit),
        skip
      }),
      prisma.quizScore.groupBy({
        by: ['userId'],
        where,
        _count: true
      })
    ]);

    // Obtener información de usuarios
    const userIds = rankings.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        isOver18: true,
        createdAt: true
      }
    });

    // Combinar datos
    const rankingsWithUsers = rankings.map((ranking, index) => {
      const user = users.find(u => u.id === ranking.userId);
      return {
        position: skip + index + 1,
        userId: ranking.userId,
        user,
        totalScore: ranking._sum.score,
        quizzesPlayed: ranking._count.userId,
        averageScore: Math.floor(ranking._sum.score / ranking._count.userId)
      };
    });

    res.json({
      success: true,
      period,
      category,
      difficulty,
      rankings: rankingsWithUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.length,
        totalPages: Math.ceil(total.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting top rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings TOP' });
  }
});

// Ranking de ganadores (premios)
router.get('/winners', async (req, res) => {
  try {
    const { 
      period = 'monthly', 
      limit = 50, 
      page = 1,
      category 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = {};
    
    if (category) {
      where.quiz = {
        category
      };
    }

    // Filtrar por período
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'daily':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = {
          gte: weekAgo
        };
        break;
      case 'monthly':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1)
        };
        break;
      case 'yearly':
        dateFilter = {
          gte: new Date(now.getFullYear(), 0, 1)
        };
        break;
      default:
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1)
        };
        break;
    }

    // Eliminamos el filtro de createdAt ya que no existe en el modelo
    // where.createdAt = dateFilter;

    const [winners, total] = await Promise.all([
      prisma.quizWinner.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          quiz: {
            select: {
              id: true,
              title: true,
              category: true,
              difficulty: true
            }
          }
        },
        orderBy: { creditsWon: 'desc' },
        take: parseInt(limit),
        skip
      }),
      prisma.quizWinner.count({ where })
    ]);

    // Agrupar por usuario para calcular totales
    const userTotals = winners.reduce((acc, winner) => {
      const userId = winner.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          user: winner.user,
          totalCredits: 0,
          totalWins: 0,
          quizzes: []
        };
      }
      acc[userId].totalCredits += winner.creditsWon;
      acc[userId].totalWins += 1;
      acc[userId].quizzes.push(winner.quiz);
      return acc;
    }, {});

    const rankings = Object.values(userTotals)
      .sort((a, b) => b.totalCredits - a.totalCredits)
      .map((user, index) => ({
        position: skip + index + 1,
        ...user,
        averageCreditsPerWin: Math.floor(user.totalCredits / user.totalWins)
      }));

    res.json({
      success: true,
      period,
      category,
      rankings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting winners rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings de ganadores' });
  }
});

// Ranking por temporadas
router.get('/seasons/:seasonId', async (req, res) => {
  try {
    const { seasonId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const season = await prisma.season.findUnique({
      where: { id: parseInt(seasonId) },
      include: {
        seasonUsers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { points: 'desc' },
          take: parseInt(limit),
          skip
        }
      }
    });

    if (!season) {
      return res.status(404).json({ error: 'Temporada no encontrada' });
    }

    const total = await prisma.seasonUser.count({
      where: { seasonId: parseInt(seasonId) }
    });

    const rankings = season.seasonUsers.map((seasonUser, index) => ({
      position: skip + index + 1,
      userId: seasonUser.userId,
      user: seasonUser.user,
      points: seasonUser.points,
      joinedAt: seasonUser.createdAt
    }));

    res.json({
      success: true,
      season: {
        id: season.id,
        name: season.name,
        startsAt: season.startsAt,
        endsAt: season.endsAt
      },
      rankings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting season rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings de temporada' });
  }
});

// ============================
// RANKINGS PERSONALES
// ============================

// Ranking personal del usuario
router.get('/my-rankings', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'all-time' } = req.query;

    // Estadísticas generales
    const [
      totalStats,
      recentScores,
      bestScores,
      totalWinnings,
      seasonRankings
    ] = await Promise.all([
      // Estadísticas totales
      prisma.quizScore.aggregate({
        where: { userId },
        _sum: { score: true },
        _count: { userId: true },
        _avg: { score: true },
        _max: { score: true }
      }),
      // Scores recientes
      prisma.quizScore.findMany({
        where: { userId },
        include: {
          quizRun: {
            include: {
              quiz: {
                select: { title: true, category: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Mejores scores
      prisma.quizScore.findMany({
        where: { userId },
        include: {
          quizRun: {
            include: {
              quiz: {
                select: { title: true, difficulty: true }
              }
            }
          }
        },
        orderBy: { score: 'desc' },
        take: 10
      }),
      // Total de premios ganados
      prisma.quizWinner.aggregate({
        where: { userId },
        _sum: { creditsWon: true },
        _count: { userId: true }
      }),
      // Rankings en temporadas
      prisma.seasonUser.findMany({
        where: { userId },
        include: {
          season: {
            select: { id: true, name: true, startsAt: true, endsAt: true }
          }
        },
        orderBy: { points: 'desc' }
      })
    ]);

    const ranking = {
      totalStats: {
        totalScore: totalStats._sum.score || 0,
        quizzesPlayed: totalStats._count.userId || 0,
        averageScore: Math.floor(totalStats._avg.score || 0),
        bestScore: totalStats._max.score || 0
      },
      recentScores: recentScores.map(score => ({
        id: score.id,
        score: score.score,
        quiz: {
          title: score.quizRun.quiz.title,
          category: score.quizRun.quiz.category
        },
        createdAt: score.createdAt
      })),
      bestScores: bestScores.map(score => ({
        id: score.id,
        score: score.score,
        quiz: {
          title: score.quizRun.quiz.title,
          difficulty: score.quizRun.quiz.difficulty
        },
        createdAt: score.createdAt
      })),
      totalWinnings: {
        totalCredits: totalWinnings._sum.creditsWon || 0,
        totalWins: totalWinnings._count.userId || 0
      },
      seasonRankings: seasonRankings.map(seasonUser => ({
        season: seasonUser.season,
        points: seasonUser.points,
        joinedAt: seasonUser.createdAt
      }))
    };

    res.json({
      success: true,
      ranking,
      period
    });
  } catch (error) {
    console.error('Error getting my rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings personales' });
  }
});

// ============================
// ESTADÍSTICAS Y MÉTRICAS
// ============================

// Estadísticas generales del sistema
router.get('/stats', async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    const [
      totalUsers,
      activeUsers,
      totalQuizzes,
      completedQuizzes,
      totalPrizePool,
      totalWinnings,
      topCategories,
      difficultyStats
    ] = await Promise.all([
      // Usuarios totales
      prisma.user.count(),
      // Usuarios activos (últimos 30 días)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      // Quizzes totales
      prisma.quiz.count({
        where: { status: 'PUBLISHED' }
      }),
      // Quizzes completados
      prisma.quizRun.count({
        where: { phase: 'FINISHED' }
      }),
      // Prize pool total
      prisma.quizRun.aggregate({
        where: { phase: 'FINISHED' },
        _sum: { totalPrizeCredits: true }
      }),
      // Premios totales
      prisma.quizWinner.aggregate({
        _sum: { creditsWon: true },
        _count: { userId: true }
      }),
      // Top categorías
      prisma.quiz.groupBy({
        by: ['category'],
        where: { 
          category: { not: null },
          status: 'PUBLISHED'
        },
        _count: true,
        orderBy: {
          _count: { category: 'desc' }
        },
        take: 10
      }),
      // Estadísticas por dificultad
      prisma.quiz.groupBy({
        by: ['difficulty'],
        where: { status: 'PUBLISHED' },
        _count: true,
        orderBy: {
          _count: { difficulty: 'desc' }
        }
      })
    ]);

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: activeUsers
      },
      quizzes: {
        total: totalQuizzes,
        completed: completedQuizzes,
        completionRate: totalQuizzes > 0 ? Math.floor((completedQuizzes / totalQuizzes) * 100) : 0
      },
      prizes: {
        totalPrizePool: totalPrizePool._sum.totalPrizeCredits || 0,
        totalWinnings: totalWinnings._sum.creditsWon || 0,
        totalWins: totalWinnings._count.userId || 0,
        averagePrizePerWin: totalWinnings._count.userId > 0 ? Math.floor((totalWinnings._sum.creditsWon || 0) / totalWinnings._count.userId) : 0
      },
      categories: topCategories.map(cat => ({
        name: cat.category,
        count: cat._count
      })),
      difficulty: difficultyStats.map(diff => ({
        level: diff.difficulty,
        count: diff._count
      }))
    };

    res.json({
      success: true,
      period,
      stats
    });
  } catch (error) {
    console.error('Error getting rankings stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ============================
// RANKINGS DE CREADORES (SOLO ADMIN)
// ============================

// Ranking de creadores de quizzes
router.get('/creators', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { period = 'monthly', limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Filtrar por período
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case 'daily':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
        };
        break;
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = {
          gte: weekAgo
        };
        break;
      case 'monthly':
        dateFilter = {
          gte: new Date(now.getFullYear(), now.getMonth(), 1)
        };
        break;
      case 'yearly':
        dateFilter = {
          gte: new Date(now.getFullYear(), 0, 1)
        };
        break;
    }

    const [creators, total] = await Promise.all([
      prisma.quiz.groupBy({
        by: ['creatorId'],
        where: {
          status: 'PUBLISHED',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        _count: { creatorId: true },
        _sum: { totalPrizeCredits: true },
        orderBy: {
          _sum: { totalPrizeCredits: 'desc' }
        },
        take: parseInt(limit),
        skip
      }),
      prisma.quiz.groupBy({
        by: ['creatorId'],
        where: {
          status: 'PUBLISHED',
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
        },
        _count: true
      })
    ]);

    // Obtener información de creadores
    const creatorIds = creators.map(c => c.creatorId);
    const users = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true
      }
    });

    const rankings = creators.map((creator, index) => {
      const user = users.find(u => u.id === creator.creatorId);
      return {
        position: skip + index + 1,
        creatorId: creator.creatorId,
        user,
        quizzesCreated: creator._count.creatorId,
        totalPrizePoolGenerated: creator._sum.totalPrizeCredits || 0
      };
    });

    res.json({
      success: true,
      period,
      rankings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.length,
        totalPages: Math.ceil(total.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting creators rankings:', error);
    res.status(500).json({ error: 'Error al obtener rankings de creadores' });
  }
});

// Legacy endpoint for compatibility
router.get("/global", async (req, res) => {
  try {
    const ranking = await prisma.user.findMany({
      orderBy: { balance: "desc" },
      take: 100,
      select: {
        id: true,
        email: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    });

    res.json(ranking);
  } catch (error) {
    console.error('Error getting global ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking global' });
  }
});

// Legacy endpoint for compatibility
router.get("/season/:seasonId", async (req, res) => {
  try {
    const { seasonId } = req.params;

    const ranking = await prisma.seasonUser.findMany({
      where: { seasonId: Number(seasonId) },
      orderBy: { points: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            balance: true,
            createdAt: true,
          },
        },
      },
    });

    res.json(ranking);
  } catch (error) {
    console.error('Error getting season ranking:', error);
    res.status(500).json({ error: 'Error al obtener ranking de temporada' });
  }
});

export default router;

