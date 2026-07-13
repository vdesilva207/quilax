import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

// ============================
// INFORMACIÓN DE QUIZ (PÚBLICA)
// ============================

// Obtener información detallada de un quiz (tips, notas, etc.)
router.get('/:quizId', async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user?.id; // Puede ser undefined si no está autenticado
    
    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      select: {
        id: true,
        title: true,
        description: true,
        tips: true,
        creatorNotes: true,
        adminNotes: true,
        difficulty: true,
        category: true,
        contentDescription: true,
        estimatedDuration: true,
        minAge: true,
        maxParticipants: true,
        status: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            fullNamf: true,
            eullName: true,
            email: true
          }
        },
        questions: {
          select: {
            id: true,
            text: true,
            options: true
          },
          take: 3 // Solo mostrar primeras 3 preguntas como preview
        },
        _count: {
          select: {
            questions: true,
            quizRuns: true,
            quizParticipants: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Verificar si el usuario puede acceder a esta información
    if (quiz.status === 'DRAFT' && (!userId || quiz.creatorId !== userId)) {
      return res.status(403).json({ error: 'No tienes permiso para ver este quiz' });
    }

    // Calcular estadísticas adicionales
    const stats = await prisma.quizRun.aggregate({
      where: { 
        quizId: parseInt(quizId),
        phase: 'FINISHED'
      },
      _avg: { totalPrizeCredits: true },
      _sum: { totalPrizeCredits: true },
      _count: { id: true }
    });

    // Verificar si el usuario ya participó
    let userParticipation = null;
    if (userId) {
      userParticipation = await prisma.quizParticipant.findFirst({
        where: {
          userId,
          quizRun: {
            quizId: parseInt(quizId)
          }
        },
        include: {
          quizRun: {
            select: {
              id: true,
              phase: true,
              finishedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    const activeRun = await prisma.quizRun.findFirst({
      where: {
        quizId: parseInt(quizId),
        phase: {
          in: ['PRE_START', 'QUESTION_READ', 'QUESTION_ANSWER', 'QUESTION_CORRECTION', 'QUESTION_RANKING'],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phase: true,
        phaseEndsAt: true,
        currentIndex: true,
        totalPrizeCredits: true,
      },
    });

    res.json({
      success: true,
      quiz: {
        ...quiz,
        stats: {
          totalRuns: stats._count.id,
          averagePrizePool: Math.floor(stats._avg.totalPrizeCredits || 0),
          totalPrizeDistributed: stats._sum.totalPrizeCredits || 0
        },
        userParticipation,
        activeRun,
        canJoin: quiz.status === 'PUBLISHED' && (!userParticipation || userParticipation.quizRun.phase === 'FINISHED'),
        isAgeRestricted: quiz.minAge ? true : false,
        hasCapacityLimit: quiz.maxParticipants ? true : false
      }
    });
  } catch (error) {
    console.error('Error getting quiz info:', error);
    res.status(500).json({ error: 'Error al obtener información del quiz' });
  }
});

// ============================
// BÚSQUEDA DE QUIZZES
// ============================

// Buscar quizzes con filtros
router.get('/', async (req, res) => {
  try {
    const {
      category,
      difficulty,
      minAge,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {
      status: 'PUBLISHED'
    };

    // Aplicar filtros
    if (category) {
      where.category = category;
    }

    if (difficulty) {
      where.difficulty = difficulty.toUpperCase();
    }

    if (minAge) {
      where.OR = [
        { minAge: null },
        { minAge: { lte: parseInt(minAge) } }
      ];
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { contentDescription: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Configurar ordenamiento
    const orderBy = {};
    orderBy[sortBy] = sortOrder.toLowerCase();

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          tips: true,
          difficulty: true,
          category: true,
          contentDescription: true,
          estimatedDuration: true,
          minAge: true,
          maxParticipants: true,
          createdAt: true,
          creator: {
            select: {
              id: true
            }
          }
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.quiz.count({ where })
    ]);

    // Obtener categorías disponibles
    const categories = await prisma.quiz.groupBy({
      by: ['category'],
      where: {
        category: { not: null },
        status: 'PUBLISHED'
      },
      _count: true
    });

    res.json({
      success: true,
      quizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        categories: categories.map(c => c.category).filter(Boolean),
        difficulties: ['EASY', 'MEDIUM', 'HARD', 'EXPERT']
      }
    });
  } catch (error) {
    console.error('Error searching quizzes:', error);
    res.status(500).json({ error: 'Error al buscar quizzes' });
  }
});

// ============================
// CATEGORÍAS Y ESTADÍSTICAS
// ============================

// Obtener todas las categorías disponibles
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.quiz.groupBy({
      by: ['category'],
      where: {
        category: { not: null },
        status: 'PUBLISHED'
      },
      _count: true,
      orderBy: {
        _count: { category: 'desc' }
      }
    });

    res.json({
      success: true,
      categories: categories.map(c => ({
        name: c.category,
        count: c._count
      }))
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Obtener quizzes por categoría
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      category,
      status: 'PUBLISHED'
    };

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          tips: true,
          difficulty: true,
          contentDescription: true,
          estimatedDuration: true,
          minAge: true,
          maxParticipants: true,
          createdAt: true,
          creator: {
            select: {
              id: true
            }
          },
          _count: {
            select: {
              quizRuns: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.quiz.count({ where })
    ]);

    res.json({
      success: true,
      category,
      quizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting quizzes by category:', error);
    res.status(500).json({ error: 'Error al obtener quizzes de la categoría' });
  }
});

// ============================
// VALIDACIONES DE ACCESO
// ============================

// Verificar si un usuario puede unirse a un quiz
router.get('/:quizId/can-join', auth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      select: {
        id: true,
        status: true,
        minAge: true,
        maxParticipants: true,
        entryCost: true
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Verificar estado del quiz
    if (quiz.status !== 'PUBLISHED') {
      return res.json({
        success: true,
        canJoin: false,
        reason: 'El quiz no está publicado'
      });
    }

    // Verificar edad del usuario
    if (quiz.minAge) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfBirth: true, isOver18: true }
      });

      if (!user.isOver18 && user.dateOfBirth) {
        const age = Math.floor((new Date() - new Date(user.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < quiz.minAge) {
          return res.json({
            success: true,
            canJoin: false,
            reason: `Debes tener al menos ${quiz.minAge} años para participar`
          });
        }
      }
    }

    // Verificar si ya participó recientemente
    const recentParticipation = await prisma.quizParticipant.findFirst({
      where: {
        userId,
        quizRun: {
          quizId: parseInt(quizId),
          phase: { in: ['PRE_START', 'QUESTION_READ', 'QUESTION_ANSWER', 'QUESTION_CORRECTION', 'QUESTION_RANKING'] }
        }
      }
    });

    if (recentParticipation) {
      return res.json({
        success: true,
        canJoin: false,
        reason: 'Ya estás participando en este quiz'
      });
    }

    // Verificar capacidad
    if (quiz.maxParticipants) {
      const currentParticipants = await prisma.quizParticipant.count({
        where: {
          quizRun: {
            quizId: parseInt(quizId),
            phase: { in: ['PRE_START', 'QUESTION_READ', 'QUESTION_ANSWER', 'QUESTION_CORRECTION', 'QUESTION_RANKING'] }
          }
        }
      });

      if (currentParticipants >= quiz.maxParticipants) {
        return res.json({
          success: true,
          canJoin: false,
          reason: 'El quiz ha alcanzado su capacidad máxima'
        });
      }
    }

    // Verificar balance del usuario
    const userBalance = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (userBalance.balance < quiz.entryCost) {
      return res.json({
        success: true,
        canJoin: false,
        reason: `No tienes suficientes créditos. Necesitas ${quiz.entryCost} créditos`,
        requiredCredits: quiz.entryCost,
        currentBalance: userBalance.balance
      });
    }

    res.json({
      success: true,
      canJoin: true,
      message: 'Puedes unirte a este quiz'
    });

  } catch (error) {
    console.error('Error checking if user can join quiz:', error);
    res.status(500).json({ error: 'Error al verificar acceso al quiz' });
  }
});

// ============================
// QUIZ SHARING
// ============================

// Generar enlace de compartir quiz
router.get('/:quizId/share', async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) },
      select: {
        id: true,
        title: true,
        category: true,
        creator: {
          select: {
            username: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Generar URL de compartir
    const shareUrl = `https://quilax.com/quiz/${quizId}`;
    const shareText = `¡Juega "${quiz.title}" en Quilax!`;
    const shareDescription = `Prueba este quiz de ${quiz.category} creado por @${quiz.creator.username}`;

    res.json({
      success: true,
      share: {
        url: shareUrl,
        text: shareText,
        description: shareDescription
      }
    });
  } catch (error) {
    console.error('Error generating quiz share link:', error);
    res.status(500).json({ error: 'Error al generar enlace de compartir' });
  }
});

// Registrar compartición de quiz (para analytics)
router.post('/:quizId/share', auth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { platform } = req.body;
    const userId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: parseInt(quizId) }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    // Aquí podrías registrar la compartición en una tabla de analytics
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: 'Compartición registrada'
    });
  } catch (error) {
    console.error('Error recording quiz share:', error);
    res.status(500).json({ error: 'Error al registrar compartición' });
  }
});

export default router;
