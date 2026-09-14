import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import { buildPrizePreview } from '../utils/quizCredits.js';

const router = express.Router();

// ============================
// INFORMACIÓN DE QUIZ (PÚBLICA)
// ============================

// Obtener información detallada de un quiz (tips, notas, etc.)
router.get('/:quizId', auth, async (req, res, next) => {
  try {
    // Let static routes like /categories fall through.
    if (!/^\d+$/.test(String(req.params.quizId || ''))) {
      return next('route');
    }

    const quizId = parseInt(req.params.quizId, 10);
    const userId = req.user?.id;

    if (!quizId) {
      return res.status(400).json({ error: 'quizId inválido' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
        questions: {
          select: {
            id: true,
            text: true,
            readTime: true,
            answerTime: true,
          },
          take: 3,
        },
        schedules: {
          orderBy: { scheduledAt: 'asc' },
          take: 5,
        },
        _count: {
          select: {
            questions: true,
            quizRuns: true,
            enrollments: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    if (quiz.status === 'DRAFT' && (!userId || quiz.creatorId !== userId)) {
      return res.status(403).json({ error: 'No tienes permiso para ver este quiz' });
    }

    const stats = await prisma.quizRun.aggregate({
      where: {
        quizId,
        phase: 'FINISHED',
      },
      _avg: { totalPrizeCredits: true },
      _sum: { totalPrizeCredits: true },
      _count: { id: true },
    });

    let userParticipation = null;
    let alreadyEnrolled = false;
    if (userId) {
      alreadyEnrolled = !!(await prisma.quizEnrollment.findUnique({
        where: { quizId_userId: { quizId, userId } },
      }));

      userParticipation = await prisma.quizParticipant.findFirst({
        where: {
          userId,
          quizRun: { quizId },
        },
        include: {
          quizRun: {
            select: {
              id: true,
              phase: true,
              finishedAt: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });
    }

    const activeRun = await prisma.quizRun.findFirst({
      where: {
        quizId,
        phase: {
          in: [
            'PRE_START',
            'QUESTION_READ',
            'QUESTION_ANSWER',
            'QUESTION_CORRECTION',
            'QUESTION_RANKING',
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        phase: true,
        phaseEndsAt: true,
        currentIndex: true,
        totalPrizeCredits: true,
        startedAt: true,
      },
    });

    const liveParticipation =
      userParticipation &&
      userParticipation.quizRun &&
      userParticipation.quizRun.phase !== 'FINISHED';

    const now = new Date();
    const nextSchedule = (quiz.schedules || []).find(
      (s) => new Date(s.scheduledAt) >= now
    ) || quiz.schedules?.[0] || null;
    const startsAt =
      nextSchedule?.scheduledAt ||
      activeRun?.startedAt ||
      activeRun?.phaseEndsAt ||
      null;

    const pool =
      activeRun?.totalPrizeCredits ??
      quiz.credits ??
      0;
    let prizePreview = { prizePool: pool, positions: [] };
    try {
      prizePreview = await buildPrizePreview(quizId, pool);
    } catch (previewErr) {
      console.warn('prizePreview skipped:', previewErr?.message || previewErr);
    }

    res.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: null,
        tips: null,
        creatorNotes: null,
        adminNotes: null,
        difficulty: quiz.difficulty,
        category: null,
        contentDescription: null,
        estimatedDuration: null,
        minAge: null,
        maxParticipants: null,
        status: quiz.status,
        createdAt: quiz.createdAt,
        creatorId: quiz.creatorId,
        creator: quiz.creator,
        questions: quiz.questions,
        schedules: quiz.schedules,
        startsAt,
        nextScheduledAt: nextSchedule?.scheduledAt || null,
        _count: quiz._count,
        enrollmentCount: quiz._count.enrollments,
        currentPrizePool: pool,
        prizePreview,
        alreadyEnrolled,
        activeRun,
        canReenter: Boolean(liveParticipation && activeRun?.id),
        stats: {
          totalRuns: stats._count.id,
          averagePrizePool: Math.floor(stats._avg.totalPrizeCredits || 0),
          totalPrizeDistributed: stats._sum.totalPrizeCredits || 0,
        },
        userParticipation,
        // Allow join CTA when published; re-entry handled by can-join / openJoinSheet.
        canJoin: quiz.status === 'PUBLISHED' && quiz._count.questions > 0,
        isAgeRestricted: false,
        hasCapacityLimit: false,
      },
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
      difficulty,
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

    if (difficulty != null && difficulty !== '') {
      const n = parseInt(difficulty, 10);
      if (Number.isFinite(n)) where.difficulty = n;
    }

    if (search) {
      where.title = { contains: String(search), mode: 'insensitive' };
    }

    const allowedSort = new Set(['createdAt', 'title', 'difficulty', 'id']);
    const orderField = allowedSort.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const orderBy = { [orderField]: String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc' };

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          difficulty: true,
          status: true,
          createdAt: true,
          creator: {
            select: {
              id: true,
              username: true,
              fullName: true,
            }
          },
          _count: {
            select: { enrollments: true, questions: true, quizRuns: true },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit)
      }),
      prisma.quiz.count({ where })
    ]);

    res.json({
      success: true,
      quizzes: quizzes.map((q) => ({
        ...q,
        category: null,
        description: null,
        enrollmentCount: q._count.enrollments,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        categories: [],
        difficulties: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
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
    // Category is not on Quiz schema yet — keep contract stable for the FE.
    res.json({
      success: true,
      categories: [],
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Obtener quizzes por categoría
router.get('/category/:category', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // No category field yet — return published quizzes as a soft fallback.
    const where = { status: 'PUBLISHED' };
    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          difficulty: true,
          createdAt: true,
          creator: {
            select: { id: true, username: true, fullName: true },
          },
          _count: {
            select: { quizRuns: true, enrollments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.quiz.count({ where }),
    ]);

    res.json({
      success: true,
      category: req.params.category,
      quizzes: quizzes.map((q) => ({
        ...q,
        category: null,
        description: null,
        enrollmentCount: q._count.enrollments,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
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
    const quizId = parseInt(req.params.quizId, 10);
    const userId = req.user.id;
    const ENTRY_COST = 1;

    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'quizId inválido' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        status: true,
        credits: true,
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    if (quiz.status !== 'PUBLISHED') {
      return res.json({
        success: true,
        canJoin: false,
        reason: 'El quiz no está publicado',
      });
    }

    if ((quiz._count?.questions || 0) < 1) {
      return res.json({
        success: true,
        canJoin: false,
        reason: 'Este quiz aún no tiene preguntas',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, isOver18: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.isOver18 === false) {
      return res.json({
        success: true,
        canJoin: false,
        reason: 'Debes ser mayor de 18 años para participar',
        code: 'UNDERAGE',
      });
    }

    const liveParticipation = await prisma.quizParticipant.findFirst({
      where: {
        userId,
        quizRun: {
          quizId,
          phase: {
            in: [
              'PRE_START',
              'QUESTION_READ',
              'QUESTION_ANSWER',
              'QUESTION_CORRECTION',
              'QUESTION_RANKING',
            ],
          },
        },
      },
      include: {
        quizRun: { select: { id: true, phase: true } },
      },
    });

    // Already in a live run: allow re-entry (FE navigates via enroll/join).
    if (liveParticipation?.quizRun) {
      return res.json({
        success: true,
        canJoin: true,
        alreadyInRun: true,
        runId: liveParticipation.quizRun.id,
        phase: liveParticipation.quizRun.phase,
        entryCost: ENTRY_COST,
        currentBalance: user.balance,
        message: 'Ya estás en esta partida',
      });
    }

    const enrollment = await prisma.quizEnrollment.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });

    if (!enrollment && (user.balance ?? 0) < ENTRY_COST) {
      return res.json({
        success: true,
        canJoin: false,
        reason: `No tienes suficientes créditos. Necesitas ${ENTRY_COST} crédito`,
        requiredCredits: ENTRY_COST,
        currentBalance: user.balance,
        code: 'INSUFFICIENT_BALANCE',
      });
    }

    // No hard player cap — product allows unbounded participation.
    return res.json({
      success: true,
      canJoin: true,
      alreadyEnrolled: !!enrollment,
      entryCost: enrollment ? 0 : ENTRY_COST,
      currentBalance: user.balance,
      message: 'Puedes unirte a este quiz',
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
    const quizId = parseInt(req.params.quizId, 10);
    if (!Number.isFinite(quizId)) {
      return res.status(400).json({ error: 'quizId inválido' });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        creator: {
          select: {
            username: true,
            fullName: true,
          },
        },
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz no encontrado' });
    }

    const creatorName = quiz.creator?.username || quiz.creator?.fullName || 'Quilax';
    const shareUrl = `https://appquilax.com/quiz/${quizId}`;
    const shareText = `¡Juega "${quiz.title}" en Quilax!`;
    const shareDescription = `Prueba este quiz creado por @${creatorName}`;

    res.json({
      success: true,
      share: {
        url: shareUrl,
        text: shareText,
        description: shareDescription,
      },
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
