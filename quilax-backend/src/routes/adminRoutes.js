import { Router } from "express";
import { auth, roleMiddleware } from "../middleware/auth.js";
import * as controller from "../controllers/adminController.js";
import prisma from "../lib/prisma.js";

const router = Router();

/*
====================================
MIDDLEWARE GLOBAL ADMIN
====================================
*/
router.use(auth);
router.use(roleMiddleware(["ADMIN"]));

/*
====================================
ADMIN QUIZZES OCCUPIED DATES
GET /admin/quizzes/occupied-dates
====================================
*/
router.get("/quizzes/occupied-dates", async (req, res) => {
  try {
    const { year, month } = req.query;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (!yearNum || !monthNum) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    // Obtener todos los quizzes con fecha programada en el mes/año especificado
    const quizzes = await prisma.quiz.findMany({
      where: {
        scheduledDate: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledDate: true,
      },
    });

    // Filtrar quizzes por mes/año y organizar por fecha/hora/minuto
    const occupiedDates = {};

    quizzes.forEach((quiz) => {
      if (!quiz.scheduledDate) return;

      const date = new Date(quiz.scheduledDate);
      const quizYear = date.getFullYear();
      const quizMonth = date.getMonth() + 1;
      const quizDay = date.getDate();
      const quizHour = date.getHours();
      const quizMinute = date.getMinutes();

      // Solo incluir quizzes del mes/año seleccionado
      if (quizYear !== yearNum || quizMonth !== monthNum) return;

      const dateKey = `${quizYear}-${quizMonth}-${quizDay}`;

      if (!occupiedDates[dateKey]) {
        occupiedDates[dateKey] = {
          date: dateKey,
          hours: {},
        };
      }

      const hourKey = quizHour.toString();
      if (!occupiedDates[dateKey].hours[hourKey]) {
        occupiedDates[dateKey].hours[hourKey] = {
          hour: hourKey,
          minutes: {},
        };
      }

      const minuteKey = quizMinute.toString();
      occupiedDates[dateKey].hours[hourKey].minutes[minuteKey] = {
        minute: minuteKey,
        status: quiz.status,
        quizId: quiz.id,
        quizTitle: quiz.title,
      };
    });

    // Convertir a array
    const occupiedDatesArray = Object.values(occupiedDates);

    res.json({
      success: true,
      occupiedDates: occupiedDatesArray,
    });
  } catch (error) {
    console.error("Error getting occupied dates:", error);
    res.status(500).json({ error: "Error al obtener fechas ocupadas" });
  }
});

/*
====================================
ADMIN DASHBOARD
GET /admin/dashboard
====================================
*/
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Quizzes pendientes de aprobación
    const pendingQuizzes = await prisma.quiz.count({
      where: { status: "PENDING_REVIEW" }
    });

    // Retiros pendientes (ahora son automáticos, pero mostramos los procesados hoy)
    const todayWithdrawals = await prisma.withdraw.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // Tickets de soporte abiertos
    const openTickets = await prisma.supportTicket.count({
      where: { status: "OPEN" }
    });

    // Usuarios activos hoy (participantes únicos)
    const activeUsersToday = await prisma.quizParticipant.groupBy({
      by: ["userId"],
      where: { joinedAt: { gte: today } },
      _count: { _all: true },
    });

    // Transacciones sospechosas
    const suspiciousTransactions = await prisma.transaction.count({
      where: { isSuspicious: true }
    });

    // Total usuarios
    const totalUsers = await prisma.user.count();

    // Total quizzes
    const totalQuizzes = await prisma.quiz.count();

    // Total quiz runs hoy
    const quizRunsToday = await prisma.quizRun.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // Ingresos del día
    const todayRevenue = await prisma.transaction.aggregate({
      where: {
        type: "BANK_TO_CREDITS",
        createdAt: { gte: today }
      },
      _sum: {
        amount: true
      }
    });

    res.json({
      success: true,
      dashboard: {
        pendingQuizzes,
        todayWithdrawals,
        openTickets,
        activeUsersToday: activeUsersToday.length,
        suspiciousTransactions,
        totalUsers,
        totalQuizzes,
        quizRunsToday,
        todayRevenue: todayRevenue._sum.amount || 0
      }
    });
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    res.status(500).json({ error: "Error al obtener dashboard" });
  }
});

/*
====================================
ADMIN INBOX
GET /admin/inbox
====================================
*/
router.get("/inbox", controller.getInbox);

/*
====================================
QUIZZES LIST
GET /admin/quizzes
====================================
*/
router.get("/quizzes", controller.getQuizzes);

/*
====================================
QUIZ DETALLE
GET /admin/quizzes/:id
====================================
*/
router.get("/quizzes/:id", controller.getQuiz);

/*
====================================
APROBAR QUIZ
POST /admin/quizzes/:id/approve
====================================
*/
router.post("/quizzes/:id/approve", controller.approveQuiz);

/*
====================================
RECHAZAR QUIZ
POST /admin/quizzes/:id/reject
====================================
*/
router.post("/quizzes/:id/reject", controller.rejectQuiz);

/*
====================================
CANCELAR QUIZ
POST /admin/quizzes/:id/cancel
====================================
*/
router.post("/quizzes/:id/cancel", controller.cancelQuiz);

/*
====================================
USERS LIST
GET /admin/users
====================================
*/
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;

    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          balance: true,
          points: true,
          emailVerified: true,
          isBankVerified: true,
          createdAt: true,
          _count: {
            select: {
              createdQuizzes: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

/*
====================================
USER DETAILS
GET /admin/users/:userId
====================================
*/
router.get("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        profilePhoto: true,
        role: true,
        balance: true,
        points: true,
        emailVerified: true,
        isBankVerified: true,
        bankAccountIban: true,
        bankAccountName: true,
        createdAt: true,

        _count: {
          select: {
            createdQuizzes: true,
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error("Error getting user details:", error);
    res.status(500).json({ error: "Error al obtener detalles del usuario" });
  }
});

/*
====================================
EDIT USER
PUT /admin/users/:userId
====================================
*/
router.put("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { username, role, balance, points, emailVerified, isBankVerified } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        username,
        role,
        balance,
        points,
        emailVerified,
        isBankVerified
      }
    });

    res.json({
      success: true,
      message: "Usuario actualizado",
      user
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

/*
====================================
BAN USER
POST /admin/users/:userId/ban
====================================
*/
router.post("/users/:userId/ban", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { reason } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.role === "ADMIN" || user.role === "ADMIN_WORKER") {
      return res.status(403).json({ error: "No puedes banear a un admin" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
      select: { id: true, email: true, isBanned: true },
    });

    if (reason) {
      console.log(`[ban] user=${userId} reason=${String(reason).slice(0, 200)}`);
    }

    res.json({
      success: true,
      message: "Usuario baneado",
      user: updated,
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: "Error al banear usuario" });
  }
});

/*
====================================
UNBAN USER
POST /admin/users/:userId/unban
====================================
*/
router.post("/users/:userId/unban", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
      select: { id: true, email: true, isBanned: true },
    });

    res.json({
      success: true,
      message: "Usuario desbaneado",
      user: updated,
    });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: "Error al desbanear usuario" });
  }
});

/*
====================================
DELETE USER
DELETE /admin/users/:userId
====================================
*/
router.delete("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.role === "ADMIN") {
      return res.status(403).json({ error: "No puedes eliminar a un admin" });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: "Usuario eliminado"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

/*
====================================
USER ANALYTICS
GET /admin/users/:userId/analytics
====================================
*/
router.get("/users/:userId/analytics", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Participaciones del usuario (QuizRun no tiene userId)
    const quizRuns = await prisma.quizParticipant.findMany({
      where: { userId },
      include: {
        quizRun: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 50,
    });

    const scores = await prisma.quizScore.findMany({
      where: { userId },
      orderBy: { lastAnswerAt: "desc" },
      take: 50,
      include: {
        quizRun: {
          select: {
            id: true,
            quizId: true,
            phase: true,
            finishedAt: true,
            quiz: { select: { id: true, title: true } },
          },
        },
      },
    });

    const prizes = await prisma.quizWinner.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        quiz: { select: { id: true, title: true } },
      },
    });

    // Quizzes creados por el usuario
    const quizzesCreated = await prisma.quiz.findMany({
      where: { creatorId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            quizRuns: true,
            enrollments: true,
          },
        },
      },
    });

    // Transacciones del usuario
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    // Balance actual
    const balance = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, points: true }
    });

    res.json({
      success: true,
      analytics: {
        user,
        totalQuizRuns: quizRuns.length,
        quizRuns,
        scores,
        prizes,
        totalPrizesWon: prizes.length,
        totalCreditsWon: prizes.reduce((s, p) => s + (p.creditsWon || 0), 0),
        totalQuizzesCreated: quizzesCreated.length,
        quizzesCreated,
        totalTransactions: transactions.length,
        transactions,
        balance
      }
    });
  } catch (error) {
    console.error("Error getting user analytics:", error);
    res.status(500).json({ error: "Error al obtener analytics del usuario" });
  }
});

/*
====================================
USER PLAY / PRIZE HISTORY (admin always sees, even if private)
GET /admin/users/:userId/history
====================================
*/
router.get("/users/:userId/history", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: "userId inválido" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        showQuizHistory: true,
        showPrizes: true,
      },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    const [participants, scores, prizes] = await Promise.all([
      prisma.quizParticipant.findMany({
        where: { userId },
        take: 100,
        orderBy: { joinedAt: "desc" },
        include: {
          quizRun: {
            select: {
              id: true,
              quizId: true,
              phase: true,
              finishedAt: true,
              quiz: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.quizScore.findMany({
        where: { userId },
        take: 100,
        orderBy: { lastAnswerAt: "desc" },
        include: {
          quizRun: {
            select: {
              id: true,
              quizId: true,
              quiz: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.quizWinner.findMany({
        where: { userId },
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          quiz: { select: { id: true, title: true } },
        },
      }),
    ]);

    const participatedMap = new Map();
    for (const p of participants) {
      participatedMap.set(p.quizRunId, {
        quizRunId: p.quizRunId,
        quizId: p.quizRun?.quizId,
        title: p.quizRun?.quiz?.title,
        status: p.status,
        score: p.score,
        joinedAt: p.joinedAt,
        finishedAt: p.quizRun?.finishedAt || null,
      });
    }
    for (const s of scores) {
      const existing = participatedMap.get(s.quizRunId) || {
        quizRunId: s.quizRunId,
        quizId: s.quizRun?.quizId,
        title: s.quizRun?.quiz?.title,
      };
      participatedMap.set(s.quizRunId, {
        ...existing,
        score: s.score ?? existing.score,
        lastAnswerAt: s.lastAnswerAt,
      });
    }

    res.json({
      success: true,
      user,
      history: {
        participated: Array.from(participatedMap.values()),
        prizes: prizes.map((p) => ({
          quizId: p.quizId,
          title: p.quiz?.title,
          creditsWon: p.creditsWon,
          percent: p.percent,
          type: p.type,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error admin user history:", error);
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

/*
====================================
FINANCIAL ANALYTICS
GET /admin/financial/analytics
====================================
*/
router.get("/financial/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Ingresos totales
    const totalRevenue = await prisma.transaction.aggregate({
      where: {
        type: "BANK_TO_CREDITS",
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Retiros totales
    const totalWithdrawals = await prisma.withdraw.aggregate({
      where: {
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Premios distribuidos
    const totalPrizes = await prisma.quizWinner.aggregate({
      where: {
        createdAt: { gte: start, lte: end }
      },
      _sum: { creditsWon: true },
      _count: { id: true }
    });

    // Comisiones de plataforma
    const platformFees = await prisma.transaction.aggregate({
      where: {
        type: "PLATFORM_FEE",
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    // Ingresos por día
    const revenueByDay = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        SUM(amount) as amount
      FROM Transaction
      WHERE type = 'BANK_TO_CREDITS'
        AND createdAt >= ${start}
        AND createdAt <= ${end}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Retiros por día
    const withdrawalsByDay = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        SUM(amount) as amount
      FROM Withdraw
      WHERE createdAt >= ${start}
        AND createdAt <= ${end}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Top usuarios por ingresos
    const topUsersByRevenue = await prisma.transaction.groupBy({
      by: ["userId"],
      where: {
        type: "BANK_TO_CREDITS",
        createdAt: { gte: start, lte: end }
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10
    });

    res.json({
      success: true,
      analytics: {
        period: { start, end },
        totalRevenue: totalRevenue._sum.amount || 0,
        totalRevenueCount: totalRevenue._count.id,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        totalWithdrawalsCount: totalWithdrawals._count.id,
        totalPrizes: totalPrizes._sum.creditsWon || 0,
        totalPrizesCount: totalPrizes._count.id,
        platformFees: platformFees._sum.amount || 0,
        platformFeesCount: platformFees._count.id,
        netRevenue: (totalRevenue._sum.amount || 0) - (totalWithdrawals._sum.amount || 0) - (totalPrizes._sum.creditsWon || 0),
        revenueByDay,
        withdrawalsByDay,
        topUsersByRevenue
      }
    });
  } catch (error) {
    console.error("Error getting financial analytics:", error);
    res.status(500).json({ error: "Error al obtener analytics financieros" });
  }
});

/*
====================================
SYSTEM MANAGEMENT
GET /admin/system/status
====================================
*/
router.get("/system/status", async (req, res) => {
  try {
    // Estado del sistema
    const systemStatus = {
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };

    res.json({
      success: true,
      systemStatus
    });
  } catch (error) {
    console.error("Error getting system status:", error);
    res.status(500).json({ error: "Error al obtener estado del sistema" });
  }
});

/*
====================================
SYSTEM SETTINGS
GET /admin/system/settings
PUT /admin/system/settings
====================================
*/
const AI_PROVIDER_NOTE_OFF =
  "Preferencia guardada como desactivada. Los quizzes y posts se revisan solo de forma manual.";
const AI_PROVIDER_NOTE_ON =
  "Preferencia activada, pero la cola de revisión automática con IA aún no está conectada a un proveedor. Mientras tanto sigue valiendo la moderación manual (calendario y posts).";

async function getOrCreateSystemSettings() {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: {} });
  }
  return settings;
}

router.get("/system/settings", async (req, res) => {
  try {
    const settings = await getOrCreateSystemSettings();
    const aiOn = Boolean(settings.aiModerationEnabled);
    res.json({
      success: true,
      settings: {
        maintenanceMode: false,
        maxQuizParticipants: 1000,
        minQuizParticipants: 2,
        platformFeePercentage: 10,
        withdrawalMinAmount: 10,
        withdrawalMaxAmount: 10000,
        quizApprovalRequired: true,
        maxWithdrawPerMonth: settings.maxWithdrawPerMonth,
        maxWithdrawPerTransaction: settings.maxWithdrawPerTransaction,
        largePrizeThreshold: settings.largePrizeThreshold,
        aiModerationEnabled: aiOn,
        aiProviderNote: aiOn ? AI_PROVIDER_NOTE_ON : AI_PROVIDER_NOTE_OFF,
        aiPipelineReady: false,
      },
    });
  } catch (error) {
    console.error("Error getting system settings:", error);
    res.status(500).json({ error: "Error al obtener configuraciones del sistema" });
  }
});

router.put("/system/settings", async (req, res) => {
  try {
    const { aiModerationEnabled } = req.body || {};
    const current = await getOrCreateSystemSettings();

    const data = {};
    if (typeof aiModerationEnabled === "boolean") {
      data.aiModerationEnabled = aiModerationEnabled;
    }

    const settings =
      Object.keys(data).length > 0
        ? await prisma.systemSettings.update({
            where: { id: current.id },
            data,
          })
        : current;

    const aiOn = Boolean(settings.aiModerationEnabled);
    res.json({
      success: true,
      message: "Configuraciones actualizadas",
      settings: {
        aiModerationEnabled: aiOn,
        aiProviderNote: aiOn ? AI_PROVIDER_NOTE_ON : AI_PROVIDER_NOTE_OFF,
        aiPipelineReady: false,
      },
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    res.status(500).json({ error: "Error al actualizar configuraciones del sistema" });
  }
});

/*
====================================
ADMIN REPORTS
GET /admin/reports
====================================
*/
router.get("/reports", async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let reportData = {};

    switch (type) {
      case "users":
        reportData = await generateUserReport(start, end);
        break;
      case "quizzes":
        reportData = await generateQuizReport(start, end);
        break;
      case "financial":
        reportData = await generateFinancialReport(start, end);
        break;
      case "system":
        reportData = await generateSystemReport(start, end);
        break;
      default:
        reportData = {
          users: await generateUserReport(start, end),
          quizzes: await generateQuizReport(start, end),
          financial: await generateFinancialReport(start, end),
          system: await generateSystemReport(start, end)
        };
    }

    res.json({
      success: true,
      report: {
        type: type || "all",
        period: { start, end },
        data: reportData
      }
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Error al generar reporte" });
  }
});

async function generateUserReport(start, end) {
  const totalUsers = await prisma.user.count({
    where: { createdAt: { gte: start, lte: end } }
  });

  const activeUsers = await prisma.quizParticipant.groupBy({
    by: ["userId"],
    where: { joinedAt: { gte: start, lte: end } },
    _count: { _all: true },
  });

  const verifiedUsers = await prisma.user.count({
    where: {
      createdAt: { gte: start, lte: end },
      emailVerified: true
    }
  });

  return {
    totalNewUsers: totalUsers,
    activeUsers: activeUsers.length,
    verifiedUsers
  };
}

async function generateQuizReport(start, end) {
  const totalQuizzes = await prisma.quiz.count({
    where: { createdAt: { gte: start, lte: end } }
  });

  const publishedQuizzes = await prisma.quiz.count({
    where: {
      createdAt: { gte: start, lte: end },
      status: "PUBLISHED"
    }
  });

  const totalQuizRuns = await prisma.quizRun.count({
    where: { createdAt: { gte: start, lte: end } }
  });

  return {
    totalQuizzes,
    publishedQuizzes,
    totalQuizRuns
  };
}

async function generateFinancialReport(start, end) {
  const revenue = await prisma.transaction.aggregate({
    where: {
      type: "BANK_TO_CREDITS",
      createdAt: { gte: start, lte: end }
    },
    _sum: { amount: true }
  });

  const withdrawals = await prisma.withdraw.aggregate({
    where: { createdAt: { gte: start, lte: end } },
    _sum: { amount: true }
  });

  return {
    revenue: revenue._sum.amount || 0,
    withdrawals: withdrawals._sum.amount || 0
  };
}

async function generateSystemReport(start, end) {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version
  };
}

/*
====================================
CATEGORIES MANAGEMENT
GET /admin/categories
POST /admin/categories
PUT /admin/categories/:id
DELETE /admin/categories/:id
====================================
*/
router.get("/categories", async (req, res) => {
  try {
    res.json({
      success: true,
      categories: [],
    });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

router.post("/categories", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Nombre de categoría es requerido" });
    }

    // Aquí podrías crear una tabla de categorías
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Categoría creada",
      category: { name, description }
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Error al crear categoría" });
  }
});

router.put("/categories/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { description } = req.body;

    // Aquí podrías actualizar la categoría
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Categoría actualizada",
      category: { name, description }
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Error al actualizar categoría" });
  }
});

router.delete("/categories/:name", async (req, res) => {
  try {
    const { name } = req.params;

    // Aquí podrías eliminar la categoría
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Categoría eliminada"
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Error al eliminar categoría" });
  }
});

/*
====================================
QUIZ ANALYTICS
GET /admin/quizzes/analytics
====================================
*/
router.get("/quizzes/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [totalQuizzes, publishedQuizzes, pendingQuizzes, totalQuizRuns, totalParticipants] = await Promise.all([
      prisma.quiz.count({
        where: { createdAt: { gte: start, lte: end } }
      }),
      prisma.quiz.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: "PUBLISHED"
        }
      }),
      prisma.quiz.count({
        where: {
          createdAt: { gte: start, lte: end },
          status: "PENDING_REVIEW"
        }
      }),
      prisma.quizRun.count({
        where: { createdAt: { gte: start, lte: end } }
      }),
      prisma.quizParticipant.count({
        where: {
          createdAt: { gte: start, lte: end }
        }
      })
    ]);

    const topQuizzes = await prisma.quiz.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: "PUBLISHED"
      },
      include: {
        _count: {
          select: { createdQuizzes: true }
        }
      },
      orderBy: {
        quizRuns: { _count: "desc" }
      },
      take: 10
    });

    const quizzesByCategory = [] /* category not in schema */;

    res.json({
      success: true,
      analytics: {
        period: { start, end },
        totalQuizzes,
        publishedQuizzes,
        pendingQuizzes,
        totalQuizRuns,
        totalParticipants,
        topQuizzes: topQuizzes.map(q => ({
          id: q.id,
          title: q.title,
          category: q.category,
          totalRuns: q._count.quizRuns
        })),
        quizzesByCategory: quizzesByCategory.map(c => ({
          category: c.category,
          count: c._count
        }))
      }
    });
  } catch (error) {
    console.error("Error getting quiz analytics:", error);
    res.status(500).json({ error: "Error al obtener analytics de quizzes" });
  }
});

/*
====================================
QUIZ REPORTS
GET /admin/quizzes/reports
====================================
*/
router.get("/quizzes/reports", async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
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

    const reports = await prisma.quizReport.findMany({
      where,
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            creator: {
              select: {
                id: true,
                username: true,
                fullName: true
              }
            }
          }
        },
        reporter: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const reportStats = await prisma.quizReport.groupBy({
      by: ["status"],
      _count: true
    });

    res.json({
      success: true,
      reports,
      stats: {
        byStatus: reportStats.reduce((acc, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        }, {}),
        total: reportStats.reduce((sum, stat) => sum + stat._count, 0)
      }
    });
  } catch (error) {
    console.error("Error getting quiz reports:", error);
    res.status(500).json({ error: "Error al obtener reportes de quizzes" });
  }
});

/*
====================================
REFUNDS MANAGEMENT
GET /admin/refunds
POST /admin/refunds/:withdrawId/process
====================================
*/
router.get("/refunds", async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
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

    const refunds = await prisma.withdraw.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const refundStats = await prisma.withdraw.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true
    });

    res.json({
      success: true,
      refunds,
      stats: {
        byStatus: refundStats.reduce((acc, stat) => {
          acc[stat.status] = {
            totalAmount: stat._sum.amount || 0,
            count: stat._count
          };
          return acc;
        }, {}),
        total: refundStats.reduce((sum, stat) => sum + stat._count, 0),
        totalAmount: refundStats.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0)
      }
    });
  } catch (error) {
    console.error("Error getting refunds:", error);
    res.status(500).json({ error: "Error al obtener reembolsos" });
  }
});

router.post("/refunds/:withdrawId/process", async (req, res) => {
  try {
    const withdrawId = parseInt(req.params.withdrawId);
    const { action, reason } = req.body;

    const withdraw = await prisma.withdraw.findUnique({
      where: { id: withdrawId },
      include: { user: true }
    });

    if (!withdraw) {
      return res.status(404).json({ error: "Retiro no encontrado" });
    }

    if (action === "approve") {
      // Procesar reembolso (devolver balance al usuario)
      await prisma.$transaction([
        prisma.withdraw.update({
          where: { id: withdrawId },
          data: { status: "COMPLETED" }
        }),
        prisma.user.update({
          where: { id: withdraw.userId },
          data: { balance: { increment: withdraw.amount } }
        })
      ]);
    } else if (action === "reject") {
      await prisma.withdraw.update({
        where: { id: withdrawId },
        data: { status: "REJECTED" }
      });
    }

    res.json({
      success: true,
      message: `Reembolso ${action === "approve" ? "aprobado" : "rechazado"}`
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: "Error al procesar reembolso" });
  }
});

/*
====================================
REVENUE ANALYTICS
GET /admin/revenue/analytics
====================================
*/
router.get("/revenue/analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Ingresos por tipo de transacción
    const revenueByType = await prisma.transaction.groupBy({
      by: ["type"],
      where: {
        createdAt: { gte: start, lte: end },
        type: { in: ["BANK_TO_CREDITS", "QUIZ_ENTRY", "PLATFORM_FEE"] }
      },
      _sum: { amount: true },
      _count: true
    });

    // Ingresos por día
    const dailyRevenue = await prisma.$queryRaw`
      SELECT
        DATE(createdAt) as date,
        SUM(amount) as amount,
        COUNT(*) as count
      FROM Transaction
      WHERE type = 'BANK_TO_CREDITS'
        AND createdAt >= ${start}
        AND createdAt <= ${end}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    // Top usuarios por ingresos
    const topUsersByRevenue = await prisma.transaction.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: start, lte: end },
        type: "BANK_TO_CREDITS"
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10
    });

    // Top quizzes por ingresos
    const topQuizzesByRevenue = await prisma.transaction.groupBy({
      by: ["quizId"],
      where: {
        createdAt: { gte: start, lte: end },
        quizId: { not: null },
        type: "QUIZ_ENTRY"
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10
    });

    res.json({
      success: true,
      analytics: {
        period: { start, end },
        revenueByType: revenueByType.reduce((acc, stat) => {
          acc[stat.type] = {
            totalAmount: stat._sum.amount || 0,
            count: stat._count
          };
          return acc;
        }, {}),
        dailyRevenue,
        totalRevenue: revenueByType.reduce((sum, stat) => sum + (stat._sum.amount || 0), 0),
        topUsersByRevenue,
        topQuizzesByRevenue
      }
    });
  } catch (error) {
    console.error("Error getting revenue analytics:", error);
    res.status(500).json({ error: "Error al obtener analytics de ingresos" });
  }
});

/*
====================================
DATABASE MANAGEMENT
GET /admin/database/stats
POST /admin/database/backup
====================================
*/
router.get("/database/stats", async (req, res) => {
  try {
    const [userCount, quizCount, quizRunCount, transactionCount] = await Promise.all([
      prisma.user.count(),
      prisma.quiz.count(),
      prisma.quizRun.count(),
      prisma.transaction.count()
    ]);

    res.json({
      success: true,
      stats: {
        users: userCount,
        quizzes: quizCount,
        quizRuns: quizRunCount,
        transactions: transactionCount
      }
    });
  } catch (error) {
    console.error("Error getting database stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de base de datos" });
  }
});

/*
====================================
CACHE MANAGEMENT
POST /admin/cache/clear
GET /admin/cache/stats
====================================
*/
router.post("/cache/clear", async (req, res) => {
  try {
    // Aquí podrías limpiar el caché de Redis
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Caché limpiado"
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ error: "Error al limpiar caché" });
  }
});

router.get("/cache/stats", async (req, res) => {
  try {
    // Aquí podrías obtener estadísticas del caché de Redis
    // Por ahora, devolvemos estadísticas simuladas
    res.json({
      success: true,
      stats: {
        keys: 0,
        memory: "0MB",
        hits: 0,
        misses: 0
      }
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({ error: "Error al obtener estadísticas de caché" });
  }
});

/*
====================================
LOGS
GET /admin/logs
====================================
*/
router.get("/logs", async (req, res) => {
  try {
    const { level, limit = 100 } = req.query;

    // Aquí podrías obtener logs del sistema
    // Por ahora, devolvemos logs simulados
    res.json({
      success: true,
      logs: [],
      stats: {
        total: 0,
        byLevel: {}
      }
    });
  } catch (error) {
    console.error("Error getting logs:", error);
    res.status(500).json({ error: "Error al obtener logs" });
  }
});

/*
====================================
MAINTENANCE
POST /admin/maintenance/enable
POST /admin/maintenance/disable
====================================
*/
router.post("/maintenance/enable", async (req, res) => {
  try {
    const { reason } = req.body;

    // Aquí podrías habilitar el modo de mantenimiento
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Modo de mantenimiento habilitado",
      reason
    });
  } catch (error) {
    console.error("Error enabling maintenance:", error);
    res.status(500).json({ error: "Error al habilitar modo de mantenimiento" });
  }
});

router.post("/maintenance/disable", async (req, res) => {
  try {
    // Aquí podrías deshabilitar el modo de mantenimiento
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Modo de mantenimiento deshabilitado"
    });
  } catch (error) {
    console.error("Error disabling maintenance:", error);
    res.status(500).json({ error: "Error al deshabilitar modo de mantenimiento" });
  }
});

/*
====================================
GESTIÓN DE TEMPORADAS
GET /admin/seasons
====================================
*/
router.get("/seasons", async (req, res) => {
  try {
    const seasons = await prisma.season.findMany({
      include: {
        _count: {
          select: {
            users: true,
            seasonWinners: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calcular información adicional para cada temporada
    const seasonsWithInfo = await Promise.all(seasons.map(async (season) => {
      const now = new Date();
      const isActive = now >= season.startsAt && now <= season.endsAt;
      const daysElapsed = Math.floor((now - season.startsAt) / (1000 * 60 * 60 * 24));
      const totalDays = Math.floor((season.endsAt - season.startsAt) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysElapsed);

      // Calcular jackpot acumulado (suma de créditos de quizzes de esta temporada)
      const quizzesInSeason = await prisma.quiz.count({
        where: {
          createdAt: {
            gte: season.startsAt,
            lte: season.endsAt
          }
        }
      });

      return {
        ...season,
        isActive,
        daysElapsed,
        totalDays,
        daysRemaining,
        quizzesCount: quizzesInSeason
      };
    }));

    res.json({
      success: true,
      seasons: seasonsWithInfo
    });
  } catch (error) {
    console.error("Error getting seasons:", error);
    res.status(500).json({ error: "Error al obtener temporadas" });
  }
});

/*
====================================
GESTIÓN DE TEMPORADAS - DETALLE
GET /admin/seasons/:seasonId
====================================
*/
router.get("/seasons/:seasonId", async (req, res) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        _count: {
          select: {
            users: true,
            seasonWinners: true
          }
        }
      }
    });

    if (!season) {
      return res.status(404).json({ error: "Temporada no encontrada" });
    }

    const now = new Date();
    const isActive = now >= season.startsAt && now <= season.endsAt;
    const daysElapsed = Math.floor((now - season.startsAt) / (1000 * 60 * 60 * 24));
    const totalDays = Math.floor((season.endsAt - season.startsAt) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysElapsed);

    // Obtener ranking actual (top 1000 usuarios por puntos)
    const ranking = await prisma.seasonUser.findMany({
      where: { seasonId },
      orderBy: { points: 'desc' },
      take: 1000,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Obtener ganadores de esta temporada
    const winners = await prisma.seasonWinner.findMany({
      where: { seasonId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: { position: 'asc' }
    });

    // Calcular jackpot acumulado
    const quizzesInSeason = await prisma.quiz.count({
      where: {
        createdAt: {
          gte: season.startsAt,
          lte: season.endsAt
        }
      }
    });

    res.json({
      success: true,
      season: {
        ...season,
        isActive,
        daysElapsed,
        totalDays,
        daysRemaining,
        quizzesCount: quizzesInSeason
      },
      ranking,
      winners
    });
  } catch (error) {
    console.error("Error getting season detail:", error);
    res.status(500).json({ error: "Error al obtener detalle de temporada" });
  }
});

/*
====================================
CREAR NUEVA TEMPORADA
POST /admin/seasons
====================================
*/
router.post("/seasons", async (req, res) => {
  try {
    const { name, startsAt, endsAt } = req.body;

    if (!name || !startsAt || !endsAt) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const season = await prisma.season.create({
      data: {
        name,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt)
      }
    });

    res.json({
      success: true,
      season
    });
  } catch (error) {
    console.error("Error creating season:", error);
    res.status(500).json({ error: "Error al crear temporada" });
  }
});

/*
====================================
CERRAR TEMPORADA
POST /admin/seasons/:seasonId/close
====================================
*/
router.post("/seasons/:seasonId/close", async (req, res) => {
  try {
    const seasonId = parseInt(req.params.seasonId);

    const season = await prisma.season.findUnique({
      where: { id: seasonId }
    });

    if (!season) {
      return res.status(404).json({ error: "Temporada no encontrada" });
    }

    // Obtener ranking final (top 1000)
    const finalRanking = await prisma.seasonUser.findMany({
      where: { seasonId },
      orderBy: { points: 'desc' },
      take: 1000,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Crear ganadores (top 10)
    const winners = finalRanking.slice(0, 10).map((user, index) => ({
      seasonId,
      userId: user.userId,
      type: index === 0 ? 'FIRST' : index < 3 ? 'TOP_3' : 'TOP_10',
      position: index + 1,
      points: user.points,
      rewardDescription: `Premio temporada ${season.name}`
    }));

    await prisma.seasonWinner.createMany({
      data: winners
    });

    // Actualizar fecha de fin
    const updatedSeason = await prisma.season.update({
      where: { id: seasonId },
      data: { endsAt: new Date() }
    });

    res.json({
      success: true,
      season: updatedSeason,
      winnersCount: winners.length
    });
  } catch (error) {
    console.error("Error closing season:", error);
    res.status(500).json({ error: "Error al cerrar temporada" });
  }
});

/*
====================================
GESTIÓN DE SOPORTE
GET /admin/support
====================================
*/
router.get("/support", async (req, res) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting support tickets:", error);
    res.status(500).json({ error: "Error al obtener tickets de soporte" });
  }
});

/*
====================================
GESTIÓN DE SOPORTE - DETALLE
GET /admin/support/:ticketId
====================================
*/
router.get("/support/:ticketId", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    console.error("Error getting support ticket:", error);
    res.status(500).json({ error: "Error al obtener ticket de soporte" });
  }
});

/*
====================================
RESPONDER TICKET
POST /admin/support/:ticketId/respond
====================================
*/
router.post("/support/:ticketId/respond", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: "Mensaje requerido" });
    }

    // Crear mensaje de respuesta
    const supportMessage = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderId: adminId,
        message
      }
    });

    // Actualizar estado del ticket si estaba cerrado
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'IN_PROGRESS' }
    });

    res.json({
      success: true,
      message: supportMessage
    });
  } catch (error) {
    console.error("Error responding to ticket:", error);
    res.status(500).json({ error: "Error al responder ticket" });
  }
});

/*
====================================
CERRAR TICKET
POST /admin/support/:ticketId/close
====================================
*/
router.post("/support/:ticketId/close", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { resolution } = req.body;

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'CLOSED',
        resolution: resolution || 'Resuelto por admin'
      }
    });

    res.json({
      success: true,
      message: "Ticket cerrado exitosamente"
    });
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({ error: "Error al cerrar ticket" });
  }
});

/*
====================================
ASIGNAR TICKET
POST /admin/support/:ticketId/assign
====================================
*/
router.post("/support/:ticketId/assign", async (req, res) => {
  try {
    const ticketId = parseInt(req.params.ticketId);
    const { assignedTo } = req.body;

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo }
    });

    res.json({
      success: true,
      message: "Ticket asignado exitosamente"
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({ error: "Error al asignar ticket" });
  }
});

/*
====================================
GESTIÓN DE KYC ENHANCED
GET /admin/kyc
====================================
*/
router.get("/kyc", async (req, res) => {
  try {
    const { status, documentType, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (documentType) where.documentType = documentType;

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      prisma.enhancedKyc.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.enhancedKyc.count({ where })
    ]);

    res.json({
      success: true,
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting KYC documents:", error);
    res.status(500).json({ error: "Error al obtener documentos KYC" });
  }
});

/*
====================================
APROBAR DOCUMENTO KYC
POST /admin/kyc/:kycId/approve
====================================
*/
router.post("/kyc/:kycId/approve", async (req, res) => {
  try {
    const kycId = parseInt(req.params.kycId);

    const kyc = await prisma.enhancedKyc.update({
      where: { id: kycId },
      data: {
        status: 'APPROVED',
        verifiedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    // Marcar usuario como verificado
    await prisma.user.update({
      where: { id: kyc.userId },
      data: { isBankVerified: true }
    });

    res.json({
      success: true,
      kyc
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({ error: "Error al aprobar documento KYC" });
  }
});

/*
====================================
RECHAZAR DOCUMENTO KYC
POST /admin/kyc/:kycId/reject
====================================
*/
router.post("/kyc/:kycId/reject", async (req, res) => {
  try {
    const kycId = parseInt(req.params.kycId);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Motivo de rechazo requerido" });
    }

    const kyc = await prisma.enhancedKyc.update({
      where: { id: kycId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      kyc
    });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    res.status(500).json({ error: "Error al rechazar documento KYC" });
  }
});

/*
====================================
GESTIÓN DE PAGOS
GET /admin/payments
====================================
*/
router.get("/payments", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.payment.count({ where })
    ]);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting payments:", error);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

/*
====================================
GESTIÓN DE PAGOS - DETALLE
GET /admin/payments/:paymentId
====================================
*/
router.get("/payments/:paymentId", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error("Error getting payment:", error);
    res.status(500).json({ error: "Error al obtener pago" });
  }
});

/*
====================================
PROCESAR REFUND
POST /admin/payments/:paymentId/refund
====================================
*/
router.post("/payments/:paymentId/refund", async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { reason } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return res.status(404).json({ error: "Pago no encontrado" });
    }

    // Aquí iría la lógica de refund con Stripe
    // Por ahora, solo marcamos como refund
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED'
      }
    });

    // Devolver créditos al usuario
    await prisma.user.update({
      where: { id: payment.userId },
      data: {
        balance: {
          increment: payment.amount
        }
      }
    });

    res.json({
      success: true,
      payment: updatedPayment
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: "Error al procesar refund" });
  }
});

/*
====================================
GESTIÓN DE NOTIFICACIONES
GET /admin/notifications
====================================
*/
router.get("/notifications", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.notification.count()
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

/*
====================================
ENVIAR NOTIFICACIÓN GLOBAL
POST /admin/notifications/global
====================================
*/
router.post("/notifications/global", async (req, res) => {
  try {
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Título y mensaje requeridos" });
    }

    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    // Crear notificación para cada usuario
    const notifications = users.map(user => ({
      userId: user.id,
      title,
      message,
      type: type || 'ANNOUNCEMENT'
    }));

    await prisma.notification.createMany({
      data: notifications
    });

    res.json({
      success: true,
      message: `Notificación enviada a ${users.length} usuarios`
    });
  } catch (error) {
    console.error("Error sending global notification:", error);
    res.status(500).json({ error: "Error al enviar notificación global" });
  }
});

/*
====================================
ENVIAR NOTIFICACIÓN A USUARIO ESPECÍFICO
POST /admin/notifications/user/:userId
====================================
*/
router.post("/notifications/user/:userId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { title, message, type } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Título y mensaje requeridos" });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'ANNOUNCEMENT'
      }
    });

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error("Error sending user notification:", error);
    res.status(500).json({ error: "Error al enviar notificación a usuario" });
  }
});

/*
====================================
GESTIÓN DE ADMINS
GET /admin/admins
====================================
*/
router.get("/admins", async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'ADMIN_WORKER']
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error("Error getting admins:", error);
    res.status(500).json({ error: "Error al obtener admins" });
  }
});

/*
====================================
CREAR ADMIN
POST /admin/admins
====================================
*/
router.post("/admins", async (req, res) => {
  try {
    const { email, username, password, role } = req.body;

    if (!email || !username || !password || !role) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    if (!['ADMIN', 'ADMIN_WORKER'].includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }

    if (String(password).length < 8 || !/[A-Z]/.test(String(password))) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres y 1 mayúscula",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsername = String(username).trim();

    const bcrypt = await import('bcrypt');
    const hashFn = bcrypt.hash || bcrypt.default?.hash;
    const hashedPassword = await hashFn(password, 10);

    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true, username: true },
    });

    if (
      existingByEmail &&
      (existingByEmail.role === 'ADMIN' || existingByEmail.role === 'ADMIN_WORKER')
    ) {
      return res.status(400).json({ error: "Ya existe un admin con ese email" });
    }

    const usernameTaken = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        ...(existingByEmail ? { id: { not: existingByEmail.id } } : {}),
      },
      select: { id: true },
    });
    if (usernameTaken) {
      return res.status(400).json({ error: "Ese username ya está en uso" });
    }

    const select = {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    };

    // Si el email ya es un USER normal, lo promocionamos (no fallar en silencio por unique).
    const admin = existingByEmail
      ? await prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            username: normalizedUsername,
            password: hashedPassword,
            adminPassword: hashedPassword,
            role,
            isBanned: false,
          },
          select,
        })
      : await prisma.user.create({
          data: {
            email: normalizedEmail,
            username: normalizedUsername,
            password: hashedPassword,
            adminPassword: hashedPassword,
            role,
            isOver18: true,
            idVerified: true,
            emailVerified: true,
          },
          select,
        });

    res.json({
      success: true,
      admin,
      promoted: Boolean(existingByEmail),
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: "Email o username ya existen" });
    }
    res.status(500).json({ error: error?.message || "Error al crear admin" });
  }
});

/*
====================================
ELIMINAR ADMIN
DELETE /admin/admins/:adminId
====================================
*/
router.delete("/admins/:adminId", async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    await prisma.user.delete({
      where: { id: adminId }
    });

    res.json({
      success: true,
      message: "Admin eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({ error: "Error al eliminar admin" });
  }
});

/*
====================================
AUDITORÍA DE ADMIN WORKERS
GET /admin/worker-audit
====================================
*/
router.get("/worker-audit", async (req, res) => {
  try {
    const { adminId, action, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (adminId) where.adminId = parseInt(adminId);
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    // Por ahora, simulamos auditoría con logs de seguridad
    const [logs, total] = await Promise.all([
      prisma.securityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.securityLog.count({ where })
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting worker audit:", error);
    res.status(500).json({ error: "Error al obtener auditoría de workers" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - DASHBOARD
GET /admin/worker/dashboard
====================================
*/
router.get("/worker/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Retiros pendientes (solo lectura para workers)
    const todayWithdrawals = await prisma.withdraw.count({
      where: {
        createdAt: { gte: today }
      }
    });

    // Tickets de soporte abiertos
    const openTickets = await prisma.supportTicket.count({
      where: { status: 'OPEN' }
    });

    // Usuarios activos hoy (participantes únicos)
    const activeUsersToday = await prisma.quizParticipant.groupBy({
      by: ["userId"],
      where: { joinedAt: { gte: today } },
      _count: { _all: true },
    });

    res.json({
      success: true,
      metrics: {
        pendingWithdrawals: todayWithdrawals,
        openTickets,
        activeUsersToday: activeUsersToday.length
      }
    });
  } catch (error) {
    console.error("Error getting worker dashboard:", error);
    res.status(500).json({ error: "Error al obtener dashboard de empleado" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - GESTIÓN DE USUARIOS (LIMITADO)
GET /admin/worker/users
====================================
*/
router.get("/worker/users", async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const where = {
      role: 'USER' // Solo usuarios normales, no admins
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          balance: true,
          points: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting worker users:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - GESTIÓN DE QUIZZES
GET /admin/worker/quizzes
====================================
*/
router.get("/worker/quizzes", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          _count: {
            select: {
              createdQuizzes: true
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
      quizzes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting worker quizzes:", error);
    res.status(500).json({ error: "Error al obtener quizzes" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - GESTIÓN DE RETIROS (LIMITADO)
GET /admin/worker/withdrawals
====================================
*/
router.get("/worker/withdrawals", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      prisma.withdraw.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.withdraw.count({ where })
    ]);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting worker withdrawals:", error);
    res.status(500).json({ error: "Error al obtener retiros" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - GESTIÓN DE SOPORTE
GET /admin/worker/support
====================================
*/
router.get("/worker/support", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.supportTicket.count({ where })
    ]);

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting worker support:", error);
    res.status(500).json({ error: "Error al obtener tickets de soporte" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - MI PERFIL
GET /admin/worker/profile
====================================
*/
router.get("/worker/profile", async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin no encontrado" });
    }

    res.json({
      success: true,
      admin
    });
  } catch (error) {
    console.error("Error getting worker profile:", error);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

/*
====================================
PANEL ADMIN EMPLEADO - CAMBIAR CONTRASEÑA
POST /admin/worker/profile/change-password
====================================
*/
router.post("/worker/profile/change-password", async (req, res) => {
  try {
    const adminId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Contraseñas requeridas" });
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin no encontrado" });
    }

    // Verificar contraseña actual
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(currentPassword, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: "Contraseña actual incorrecta" });
    }

    // Hash nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

/*
====================================
OBTENER MENSAJES DE USUARIOS (INBOX) (ADMIN)
GET /admin/messages/inbox
====================================
*/
router.get("/messages/inbox", async (req, res) => {
  try {
    const messages = await prisma.adminMessage.findMany({
      where: {
        recipientType: "ADMIN"
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    res.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        userId: m.userId,
        username: m.user.username,
        subject: m.subject,
        message: m.message,
        status: m.status,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching user messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
====================================
MARCAR MENSAJE COMO LEÍDO (ADMIN)
POST /admin/messages/inbox/:id/read
====================================
*/
router.post("/messages/inbox/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.adminMessage.update({
      where: { id: parseInt(id) },
      data: { status: "READ" }
    });

    res.json({
      success: true,
      message: "Mensaje marcado como leído"
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
====================================
OBTENER MENSAJES DE ADMINISTRACIÓN (ADMIN)
GET /admin/messages/admin
====================================
*/
router.get("/messages/admin", async (req, res) => {
  try {
    const messages = await prisma.adminInternalMessage.findMany({
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    res.json({
      success: true,
      messages: messages.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.sender.username,
        subject: m.subject,
        message: m.message,
        createdAt: m.createdAt
      }))
    });
  } catch (error) {
    console.error("Error fetching admin messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
====================================
ENVIAR MENSAJE A ADMINISTRACIÓN (ADMIN)
POST /admin/messages/admin
====================================
*/
router.post("/messages/admin", async (req, res) => {
  try {
    const { subject, message } = req.body;
    const senderId = req.user.id;

    if (!subject || !message) {
      return res.status(400).json({ success: false, error: "Asunto y mensaje son requeridos" });
    }

    const adminMessage = await prisma.adminInternalMessage.create({
      data: {
        senderId,
        subject,
        message
      }
    });

    res.json({
      success: true,
      message: "Mensaje enviado a administración",
      adminMessage
    });
  } catch (error) {
    console.error("Error sending admin message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
====================================
ESTADÍSTICAS FINANCIERAS (ADMIN)
GET /admin/financial/stats
====================================
*/
router.get("/financial/stats", async (req, res) => {
  try {
    // Calcular estadísticas financieras
    const totalCredits = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: {
          in: ["BANK_TO_CREDITS", "QUIZ_ENTRY", "PLATFORM_FEE"]
        }
      }
    });

    const totalRevenue = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: {
          in: ["BANK_TO_CREDITS", "QUIZ_ENTRY", "PLATFORM_FEE"]
        }
      }
    });

    const totalWithdrawals = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        type: "WITHDRAWAL"
      }
    });

    const pendingWithdrawals = await prisma.transaction.count({
      where: {
        type: "WITHDRAWAL",
        status: "PENDING_REVIEW"
      }
    });

    const completedPayments = await prisma.transaction.count({
      where: {
        type: "PAYMENT",
        status: "COMPLETED"
      }
    });

    const pendingPayments = await prisma.transaction.count({
      where: {
        type: "PAYMENT",
        status: "PENDING_REVIEW"
      }
    });

    res.json({
      success: true,
      stats: {
        totalCredits: totalCredits._sum.amount || 0,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        pendingWithdrawals,
        completedPayments,
        pendingPayments
      }
    });
  } catch (error) {
    console.error("Error fetching financial stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/*
====================================
OBTENER PAGOS (ADMIN)
GET /admin/payments
====================================
*/
router.get("/payments", async (req, res) => {
  try {
    const { status } = req.query;

    const where = status ? { status } : {};

    const payments = await prisma.transaction.findMany({
      where: {
        type: "PAYMENT",
        ...where
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    res.json({
      success: true,
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        user: p.user
      }))
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;