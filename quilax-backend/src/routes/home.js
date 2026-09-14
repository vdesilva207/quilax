import express from "express";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

function mapHomeQuiz(q) {
  const nextSchedule = q.schedules?.[0]?.scheduledAt ?? null;
  return {
    id: q.id,
    title: q.title,
    status: q.status,
    difficulty: q.difficulty,
    category: null,
    language: null,
    createdAt: q.createdAt,
    creator: q.creator,
    enrollmentCount: q._count?.enrollments ?? 0,
    playCount: q._count?.quizRuns ?? 0,
    nextScheduledAt: nextSchedule,
    estimatedPrize: null,
  };
}

const quizListInclude = {
  _count: {
    select: {
      quizRuns: true,
      enrollments: true,
      questions: true,
    },
  },
  creator: {
    select: {
      id: true,
      username: true,
      fullName: true,
    },
  },
  schedules: {
    orderBy: { scheduledAt: "asc" },
    take: 1,
  },
};

// Home screen - obtener datos principales
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const publishedWhere = { status: "PUBLISHED" };

    const [hottestQuizzes, newestQuizzes, currentSeason] = await Promise.all([
      prisma.quiz.findMany({
        where: publishedWhere,
        include: quizListInclude,
        orderBy: {
          enrollments: { _count: "desc" },
        },
        take: 10,
      }),
      prisma.quiz.findMany({
        where: publishedWhere,
        include: quizListInclude,
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.season.findFirst({
        where: {
          startsAt: { lte: new Date() },
          endsAt: { gte: new Date() },
        },
        orderBy: { startsAt: "desc" },
      }),
    ]);

    let seasonRanking = [];
    if (currentSeason) {
      try {
        seasonRanking = await prisma.seasonUser.findMany({
          where: { seasonId: currentSeason.id },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                fullName: true,
                profilePhoto: true,
              },
            },
          },
          orderBy: { points: "desc" },
          take: 10,
        });
      } catch (seasonErr) {
        console.warn("season ranking skipped:", seasonErr?.message || seasonErr);
        seasonRanking = [];
      }
    }

    const recentParticipation = await prisma.quizParticipant.findMany({
      where: { userId },
      include: {
        quizRun: {
          include: {
            quiz: {
              select: { id: true, title: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 5,
    });

    const recentActivity = recentParticipation.map((p) => ({
      id: p.quizRunId,
      quizId: p.quizRun?.quizId,
      phase: p.quizRun?.phase,
      joinedAt: p.joinedAt,
      quiz: p.quizRun?.quiz
        ? { id: p.quizRun.quiz.id, title: p.quizRun.quiz.title, category: null }
        : null,
    }));

    const enrollments = await prisma.quizEnrollment.findMany({
      where: { userId },
      include: {
        quiz: {
          include: {
            schedules: { orderBy: { scheduledAt: "asc" } },
            quizRuns: {
              where: { phase: { not: "FINISHED" } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const now = new Date();
    const myUpcomingEnrollments = [];
    for (const enrollment of enrollments) {
      const quiz = enrollment.quiz;
      if (!quiz) continue;
      const futureSchedule = (quiz.schedules || []).find(
        (s) => new Date(s.scheduledAt) >= now
      );
      const activeRun = quiz.quizRuns?.[0] || null;
      const isActivePhase =
        activeRun &&
        [
          "PRE_START",
          "QUESTION_READ",
          "QUESTION_ANSWER",
          "QUESTION_CORRECTION",
          "QUESTION_RANKING",
        ].includes(activeRun.phase);

      // Show enrolled PUBLISHED quizzes even without schedule (local playtest).
      if (!futureSchedule && !isActivePhase && quiz.status !== "PUBLISHED") {
        continue;
      }

      myUpcomingEnrollments.push({
        enrollmentId: enrollment.id,
        quizId: quiz.id,
        title: quiz.title,
        category: null,
        enrollmentCount: quiz._count?.enrollments || 0,
        startsAt: futureSchedule?.scheduledAt || activeRun?.startedAt || null,
        activeRunId: activeRun?.id || null,
        phase: activeRun?.phase || null,
      });
    }

    const mappedNewest = newestQuizzes.map(mapHomeQuiz);
    const mappedHottest = hottestQuizzes.map(mapHomeQuiz);

    res.json({
      success: true,
      data: {
        hottestQuizzes: mappedHottest,
        newestQuizzes: mappedNewest,
        seasonRanking,
        recentActivity,
        quickPlayQuiz: mappedNewest[0] || null,
        currentSeason: currentSeason
          ? {
              id: currentSeason.id,
              name: currentSeason.name,
              endsAt: currentSeason.endsAt,
            }
          : null,
        myUpcomingEnrollments,
        upcomingCount: myUpcomingEnrollments.length,
        hotCategories: [],
        nextQuiz: myUpcomingEnrollments[0]
          ? {
              id: myUpcomingEnrollments[0].quizId,
              title: myUpcomingEnrollments[0].title,
              category: null,
              nextScheduledAt: myUpcomingEnrollments[0].startsAt,
            }
          : mappedNewest[0]
            ? {
                id: mappedNewest[0].id,
                title: mappedNewest[0].title,
                category: null,
                nextScheduledAt: mappedNewest[0].nextScheduledAt,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("Error getting home data:", error);
    res.status(500).json({ error: "Error al obtener datos de home" });
  }
});

// Hottest quizzes específicamente
router.get("/hottest", async (req, res) => {
  try {
    const hottestQuizzes = await prisma.quiz.findMany({
      where: { status: "PUBLISHED" },
      include: quizListInclude,
      orderBy: {
        enrollments: { _count: "desc" },
      },
      take: 20,
    });

    res.json({
      success: true,
      quizzes: hottestQuizzes.map(mapHomeQuiz),
    });
  } catch (error) {
    console.error("Error getting hottest quizzes:", error);
    res.status(500).json({ error: "Error al obtener quizzes más populares" });
  }
});

// Ranking de temporada (contrato FE: GET /home/season-ranking)
router.get("/season-ranking", auth, async (req, res) => {
  try {
    const currentSeason = await prisma.season.findFirst({
      where: {
        startsAt: { lte: new Date() },
        endsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "desc" },
    });

    if (!currentSeason) {
      return res.json({ success: true, ranking: [], season: null });
    }

    let ranking = [];
    try {
      ranking = await prisma.seasonUser.findMany({
        where: { seasonId: currentSeason.id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              profilePhoto: true,
            },
          },
        },
        orderBy: { points: "desc" },
        take: 50,
      });
    } catch (err) {
      console.warn("season-ranking query skipped:", err?.message || err);
    }

    res.json({
      success: true,
      season: {
        id: currentSeason.id,
        name: currentSeason.name,
        endsAt: currentSeason.endsAt,
      },
      ranking,
    });
  } catch (error) {
    console.error("Error getting season ranking:", error);
    res.status(500).json({ error: "Error al obtener ranking de temporada" });
  }
});

// Recent activity del usuario
router.get("/recent-activity", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const recentParticipation = await prisma.quizParticipant.findMany({
      where: { userId },
      include: {
        quizRun: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                creator: { select: { id: true, username: true } },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: limit,
    });

    res.json({
      success: true,
      activity: recentParticipation.map((p) => ({
        id: p.quizRunId,
        joinedAt: p.joinedAt,
        quiz: p.quizRun?.quiz
          ? { ...p.quizRun.quiz, category: null }
          : null,
      })),
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
      where: { status: "PUBLISHED" },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        _count: { select: { questions: true, enrollments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!quickPlayQuiz) {
      return res.json({
        success: true,
        quiz: null,
        message: "No hay quizzes disponibles para quick play",
      });
    }

    res.json({
      success: true,
      quiz: {
        ...mapHomeQuiz({
          ...quickPlayQuiz,
          schedules: [],
          _count: {
            ...quickPlayQuiz._count,
            quizRuns: 0,
          },
        }),
      },
    });
  } catch (error) {
    console.error("Error getting quick play quiz:", error);
    res.status(500).json({ error: "Error al obtener quiz para quick play" });
  }
});

export default router;
