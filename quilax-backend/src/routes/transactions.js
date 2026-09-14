import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { getSuspiciousTransactions } from '../services/suspiciousTransactionService.js';

const router = express.Router();

// ============================
// HISTORIAL DE TRANSACCIONES
// ============================

// Obtener historial completo de transacciones del usuario
router.get('/my-history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      period = 'all-time',
      category 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = { userId };
    
    if (type) {
      where.type = type.toUpperCase();
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
    }

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Filtrar por categoría (quiz vs pagos vs retiros)
    if (category) {
      switch (category) {
        case 'quiz':
          where.type = { in: ['QUIZ_ENTRY', 'PRIZE_PAYOUT'] };
          break;
        case 'payments':
          where.type = { in: ['BANK_TO_CREDITS', 'WITHDRAW'] };
          break;
        case 'fees':
          where.type = 'PLATFORM_FEE';
          break;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          quiz: {
            select: {
              id: true,
              title: true,

              difficulty: true
            }
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.transaction.count({ where })
    ]);

    // Calcular estadísticas del período
    const stats = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      _sum: { amount: true },
      _count: true
    });

    // Formatear transacciones con información adicional
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: transaction.createdAt,
      quiz: transaction.quiz,
      description: getTransactionDescription(transaction),
      isCredit: transaction.amount > 0,
      isDebit: transaction.amount < 0
    }));

    res.json({
      success: true,
      transactions: formattedTransactions,
      stats: {
        totalByType: stats.reduce((acc, stat) => {
          acc[stat.type] = {
            totalAmount: stat._sum.amount || 0,
            count: stat._count,
            averageAmount: stat._count > 0 ? Math.floor((stat._sum.amount || 0) / stat._count) : 0
          };
          return acc;
        }, {}),
        totalTransactions: stats.reduce((sum, stat) => sum + stat._count, 0),
        netBalance: stats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        type,
        period,
        category
      }
    });
  } catch (error) {
    console.error('Error getting transaction history:', error);
    res.status(500).json({ error: 'Error al obtener historial de transacciones' });
  }
});

// Obtener detalles de una transacción específica
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const transaction = await prisma.transaction.findUnique({
      where: { 
        id: parseInt(transactionId),
        userId 
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,

            difficulty: true,
            creator: {
              select: {
                id: true,
                fullName: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }

    // Obtener información adicional según el tipo de transacción
    let additionalInfo = {};
    
    if (transaction.type === 'QUIZ_ENTRY') {
      const quizRun = await prisma.quizRun.findUnique({
        where: { id: transaction.quizId },
        select: {
          id: true,
          phase: true,
          finishedAt: true,
          totalPrizeCredits: true
        }
      });
      additionalInfo.quizRun = quizRun;
    }

    if (transaction.type === 'PRIZE_PAYOUT') {
      const quizWinner = await prisma.quizWinner.findFirst({
        where: {
          userId,
          quizId: transaction.quizId
        },
        select: {
          id: true,
          creditsWon: true,
          percent: true,
          type: true
        }
      });
      additionalInfo.quizWinner = quizWinner;
    }

    res.json({
      success: true,
      transaction: {
        ...transaction,
        description: getTransactionDescription(transaction),
        additionalInfo,
        isCredit: transaction.amount > 0,
        isDebit: transaction.amount < 0
      }
    });
  } catch (error) {
    console.error('Error getting transaction details:', error);
    res.status(500).json({ error: 'Error al obtener detalles de transacción' });
  }
});

// ============================
// ESTADÍSTICAS DE TRANSACCIONES
// ============================

// Obtener estadísticas personales de transacciones
router.get('/my-stats', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query;

    // Construir filtro de período
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

    const where = {
      userId,
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
    };

    const [
      typeStats,
      totalStats,
      recentTransactions,
      balanceHistory
    ] = await Promise.all([
      // Estadísticas por tipo
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
        _max: { amount: true },
        _min: { amount: true }
      }),
      // Estadísticas totales
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _max: { amount: true },
        _min: { amount: true }
      }),
      // Transacciones recientes
      prisma.transaction.findMany({
        where,
        include: {
          quiz: {
            select: { title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Evolución del balance
      prisma.transaction.groupBy({
        by: ['createdAt'],
        where,
        _sum: { amount: true },
        orderBy: { createdAt: 'asc' },
        take: 30 // Últimos 30 días
      })
    ]);

    const stats = {
      period,
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = {
          totalAmount: stat._sum.amount || 0,
          count: stat._count,
          averageAmount: stat._count > 0 ? Math.floor((stat._sum.amount || 0) / stat._count) : 0,
          maxAmount: stat._max.amount || 0,
          minAmount: stat._min.amount || 0
        };
        return acc;
      }, {}),
      total: {
        totalAmount: totalStats._sum.amount || 0,
        count: totalStats._count,
        averageAmount: Math.floor(totalStats._avg.amount || 0),
        maxAmount: totalStats._max.amount || 0,
        minAmount: totalStats._min.amount || 0
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        createdAt: t.createdAt,
        description: getTransactionDescription(t),
        quiz: t.quiz
      })),
      balanceEvolution: balanceHistory.map(h => ({
        date: h.createdAt,
        cumulativeAmount: h._sum.amount || 0
      }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de transacciones' });
  }
});

// ============================
// TRANSACCIONES ADMIN (SOLO ADMIN)
// ============================

// Obtener todas las transacciones del sistema (admin)
router.get('/admin/all', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      userId,
      period = 'monthly'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Construir filtros
    const where = {};
    
    if (type) {
      where.type = type.toUpperCase();
    }

    if (userId) {
      where.userId = parseInt(userId);
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
    }

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
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

            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        ...t,
        description: getTransactionDescription(t)
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        type,
        userId,
        period
      }
    });
  } catch (error) {
    console.error('Error getting admin transactions:', error);
    res.status(500).json({ error: 'Error al obtener transacciones del sistema' });
  }
});

// Estadísticas generales del sistema (admin)
router.get('/admin/stats', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    // Construir filtro de período
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

    const where = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const [
      totalStats,
      typeStats,
      userStats,
      quizStats,
      dailyVolume
    ] = await Promise.all([
      // Estadísticas totales
      prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
        _max: { amount: true },
        _min: { amount: true }
      }),
      // Estadísticas por tipo
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true
      }),
      // Estadísticas por usuario (top 10)
      prisma.transaction.groupBy({
        by: ['userId'],
        where,
        _sum: { amount: true },
        _count: true,
        orderBy: {
          _sum: { amount: 'desc' }
        },
        take: 10
      }),
      // Estadísticas por quiz (top 10)
      prisma.transaction.groupBy({
        by: ['quizId'],
        where: {
          ...where,
          quizId: { not: null }
        },
        _sum: { amount: true },
        _count: true,
        orderBy: {
          _sum: { amount: 'desc' }
        },
        take: 10
      }),
      // Volumen diario
      prisma.transaction.groupBy({
        by: ['createdAt'],
        where: {
          ...where,
          createdAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
          }
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Obtener información de usuarios y quizzes top
    const topUserIds = userStats.map(s => s.userId);
    const topQuizIds = quizStats.map(s => s.quizId);

    const [topUsers, topQuizzes] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }),
      prisma.quiz.findMany({
        where: { id: { in: topQuizIds } },
        select: {
          id: true,
          title: true,

          difficulty: true
        }
      })
    ]);

    const stats = {
      period,
      total: {
        totalAmount: totalStats._sum.amount || 0,
        count: totalStats._count,
        averageAmount: Math.floor(totalStats._avg.amount || 0),
        maxAmount: totalStats._max.amount || 0,
        minAmount: totalStats._min.amount || 0
      },
      byType: typeStats.reduce((acc, stat) => {
        acc[stat.type] = {
          totalAmount: stat._sum.amount || 0,
          count: stat._count,
          averageAmount: stat._count > 0 ? Math.floor((stat._sum.amount || 0) / stat._count) : 0
        };
        return acc;
      }, {}),
      topUsers: userStats.map((stat, index) => {
        const user = topUsers.find(u => u.id === stat.userId);
        return {
          position: index + 1,
          userId: stat.userId,
          user,
          totalAmount: stat._sum.amount || 0,
          count: stat._count
        };
      }),
      topQuizzes: quizStats.map((stat, index) => {
        const quiz = topQuizzes.find(q => q.id === stat.quizId);
        return {
          position: index + 1,
          quizId: stat.quizId,
          quiz,
          totalAmount: stat._sum.amount || 0,
          count: stat._count
        };
      }),
      dailyVolume: dailyVolume.map(d => ({
        date: d.createdAt,
        totalAmount: d._sum.amount || 0,
        count: d._count
      }))
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting admin transaction stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del sistema' });
  }
});

// ============================
// UTILIDADES
// ============================

// Función para generar descripción de transacción
function getTransactionDescription(transaction) {
  const descriptions = {
    'QUIZ_ENTRY': 'Entrada a quiz',
    'PRIZE_PAYOUT': 'Premio ganado',
    'PLATFORM_FEE': 'Comisión de plataforma',
    'WITHDRAW': 'Retiro de fondos',
    'BANK_TO_CREDITS': 'Compra de créditos'
  };

  let description = descriptions[transaction.type] || 'Transacción';
  
  if (transaction.quiz) {
    description += ` - ${transaction.quiz.title}`;
  }

  return description;
}

// ============================
// TRANSACCIONES SOSPECHOSAS (ADMIN)
// ============================

// Obtener transacciones sospechosas
router.get('/suspicious', auth, roleMiddleware(['ADMIN', 'ADMIN_WORKER']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await getSuspiciousTransactions(page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting suspicious transactions:', error);
    res.status(500).json({ error: 'Error al obtener transacciones sospechosas' });
  }
});

// ============================
// TRANSACTION EXPORT
// ============================

// Exportar transacciones a CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type } = req.query;

    const where = { userId };

    if (type) {
      where.type = type.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        quiz: {
          select: {
            title: true,

          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generar CSV
    const csvHeader = 'ID,Type,Amount,Currency,Date,Quiz Title,Category,Description\n';
    const csvRows = transactions.map(t => {
      return `${t.id},${t.type},${t.amount},${t.currency},${t.createdAt.toISOString()},${t.quiz?.title || ''},${t.quiz?.category || ''},"${getTransactionDescription(t)}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({ error: 'Error al exportar transacciones' });
  }
});

// Exportar transacciones a JSON
router.get('/export/json', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, type } = req.query;

    const where = { userId };

    if (type) {
      where.type = type.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        quiz: {
          select: {
            title: true,

          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const exportData = transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      date: t.createdAt,
      quiz: t.quiz,
      description: getTransactionDescription(t)
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting transactions:', error);
    res.status(500).json({ error: 'Error al exportar transacciones' });
  }
});

// ============================
// TRANSACCIONES SOSPECHOSAS (ADMIN)
// ============================

// Obtener transacciones sospechosas
router.get('/suspicious', auth, roleMiddleware(['ADMIN', 'ADMIN_WORKER']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const result = await getSuspiciousTransactions(page, limit);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error getting suspicious transactions:', error);
    res.status(500).json({ error: 'Error al obtener transacciones sospechosas' });
  }
});

export default router;
