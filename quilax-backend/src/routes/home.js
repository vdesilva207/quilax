import express from "express";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Home screen - obtener datos principales
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Hottest quizzes (más jugados en últimos 7 días)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const hottestQuizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
        scheduledAt: { lte: new Date() }
      },
      include: {
        _count: {
          select: {
            quizRuns: {
              where: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        quizRuns: {
          _count: "desc"
        }
      },
      take: 10
    });

    // Newest quizzes
    const newestQuizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
        scheduledAt: { lte: new Date() }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 10
    });

    // Season ranking (top 10)
    const currentSeason = await prisma.season.findFirst({
      where: {
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() }
      },
      orderBy: {
        startsAt: "desc"
      }
    });

    let seasonRanking = [];
    if (currentSeason) {
      seasonRanking = await prisma.seasonWinner.findMany({
        where: {
          seasonId: currentSeason.id
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              profilePhoto: true
            }
          }
        },
        orderBy: {
          rank: "asc"
        },
        take: 10
      });
    }

    // Recent activity del usuario
    const recentActivity = await prisma.quizRun.findMany({
      where: {
        userId: userId
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    // Quick play (quiz aleatorio disponible)
    const quickPlayQuiz = await prisma.quiz.findFirst({
      where: {
        status: "PUBLISHED",
        scheduledAt: { lte: new Date() },
        scheduledEnd: { gte: new Date() }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        hottestQuizzes: hottestQuizzes.map(q => ({
          ...q,
          playCount: q._count.quizRuns
        })),
        newestQuizzes,
        seasonRanking,
        recentActivity,
        quickPlayQuiz,
        currentSeason: currentSeason ? {
          id: currentSeason.id,
          name: currentSeason.name,
          endsAt: currentSeason.endsAt
        } : null
      }
    });
  } catch (error) {
    console.error("Error getting home data:", error);
    res.status(500).json({ error: "Error al obtener datos de home" });
  }
});

// Hottest quizzes específicamente
router.get("/hottest", async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const hottestQuizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
        scheduledAt: { lte: new Date() }
      },
      include: {
        _count: {
          select: {
            quizRuns: {
              where: {
                createdAt: { gte: sevenDaysAgo }
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        quizRuns: {
          _count: "desc"
        }
      },
      take: 20
    });

    res.json({
      success: true,
      quizzes: hottestQuizzes.map(q => ({
        ...q,
        playCount: q._count.quizRuns
      }))
    });
  } catch (error) {
    console.error("Error getting hottest quizzes:", error);
    res.status(500).json({ error: "Error al obtener quizzes más populares" });
  }
});

// Recent activity del usuario
router.get("/recent-activity", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const recentActivity = await prisma.quizRun.findMany({
      where: {
        userId: userId
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            category: true,
            creator: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    res.json({
      success: true,
      activity: recentActivity
    });
  } catch (error) {
    console.error("Error getting recent activity:", error);
    res.status(500).json({ error: "Error al obtener actividad reciente" });
  }
});

// Quick play (quiz aleatorio disponible)
router.get("/quick-play", async (req, res) => {
  try {
    const quickPlayQuiz = await prisma.quiz.findFirst({
      where: {
        status: "PUBLISHED",
        scheduledAt: { lte: new Date() },
        scheduledEnd: { gte: new Date() }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        questions: {
          select: {
            id: true,
            question: true,
            options: true,
            correctOption: true,
            points: true,
            timeLimit: true
          }
        }
      }
    });

    if (!quickPlayQuiz) {
      return res.json({
        success: true,
        quiz: null,
        message: "No hay quizzes disponibles para quick play"
      });
    }

    res.json({
      success: true,
      quiz: quickPlayQuiz
    });
  } catch (error) {
    console.error("Error getting quick play quiz:", error);
    res.status(500).json({ error: "Error al obtener quiz para quick play" });
  }
});

export default router;
