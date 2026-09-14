import express from "express";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Búsqueda multi-tipo (quizzes, categorías, usuarios)
router.get("/", auth, async (req, res) => {
  try {
    const { q, type, limit = 20 } = req.query;
    const userId = req.user.id;

    if (!q) {
      return res.status(400).json({ error: "Query es requerido" });
    }

    const searchLimit = parseInt(limit);
    const results = {
      quizzes: [],
      categories: [],
      users: []
    };

    // Buscar quizzes
    if (!type || type === "quizzes") {
      const quizzes = await prisma.quiz.findMany({
        where: {
          status: "PUBLISHED",
          title: { contains: String(q), mode: "insensitive" },
        },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              quizRuns: true,
              enrollments: true,
            },
          },
        },
        take: searchLimit,
        orderBy: { createdAt: "desc" },
      });

      const participated = await prisma.quizParticipant.findMany({
        where: {
          userId,
          quizRun: { quizId: { in: quizzes.map((quiz) => quiz.id) } },
        },
        select: { quizRun: { select: { quizId: true } } },
      });
      const playedQuizIds = new Set(participated.map((p) => p.quizRun.quizId));

      results.quizzes = quizzes
        .map((quiz) => ({
          id: quiz.id,
          title: quiz.title,
          status: quiz.status,
          creator: quiz.creator,
          enrollmentCount: quiz._count.enrollments,
          playCount: quiz._count.quizRuns,
          category: null,
          played: playedQuizIds.has(quiz.id),
        }))
        .sort((a, b) => (a.played === b.played ? 0 : a.played ? 1 : -1));
    }

    // Buscar categorías — no hay campo category en el schema actual
    if (!type || type === "categories") {
      results.categories = [];
    }

    // Buscar usuarios
    if (!type || type === "users") {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          username: true,
          profilePhoto: true,
          _count: {
            select: {
              createdQuizzes: true,
            }
          }
        },
        take: searchLimit
      });

      results.users = users.map((u) => ({
        ...u,
        _count: {
          quizzes: u._count?.createdQuizzes ?? 0,
        },
      }));
    }

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error("Error searching:", error);
    res.status(500).json({ error: "Error al buscar" });
  }
});

// Filtrar por categorías
router.post("/filter-categories", auth, async (req, res) => {
  try {
    const { categories } = req.body;
    const userId = req.user.id;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: "Categorías son requeridas" });
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true
          }
        },
        _count: {
          select: {
            quizRuns: true,
            enrollments: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const participated = await prisma.quizParticipant.findMany({
      where: {
        userId,
        quizRun: { quizId: { in: quizzes.map((quiz) => quiz.id) } },
      },
      select: { quizRun: { select: { quizId: true } } },
    });
    const playedQuizIds = new Set(participated.map((p) => p.quizRun.quizId));

    const filteredQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      title: quiz.title,
      creator: quiz.creator,
      enrollmentCount: quiz._count.enrollments,
      playCount: quiz._count.quizRuns,
      category: null,
      played: playedQuizIds.has(quiz.id)
    })).sort((a, b) => (a.played === b.played) ? 0 : a.played ? 1 : -1);

    res.json({
      success: true,
      quizzes: filteredQuizzes,
      note: "Las categorías aún no están en el schema; se listan quizzes publicados.",
    });
  } catch (error) {
    console.error("Error filtering by categories:", error);
    res.status(500).json({ error: "Error al filtrar por categorías" });
  }
});

// Newest quizzes en búsqueda
router.get("/newest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const newestQuizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        },
        _count: { select: { enrollments: true, quizRuns: true } },
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    res.json({
      success: true,
      quizzes: newestQuizzes.map((q) => ({
        id: q.id,
        title: q.title,
        creator: q.creator,
        enrollmentCount: q._count.enrollments,
        playCount: q._count.quizRuns,
        category: null,
      })),
    });
  } catch (error) {
    console.error("Error getting newest quizzes:", error);
    res.status(500).json({ error: "Error al obtener quizzes más recientes" });
  }
});

// Hottest quizzes en búsqueda
router.get("/hottest", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const hottestQuizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
      },
      include: {
        _count: {
          select: {
            quizRuns: true,
            enrollments: true,
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
        enrollments: {
          _count: "desc"
        }
      },
      take: limit
    });

    res.json({
      success: true,
      quizzes: hottestQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        creator: q.creator,
        playCount: q._count.quizRuns,
        enrollmentCount: q._count.enrollments,
        category: null,
      }))
    });
  } catch (error) {
    console.error("Error getting hottest quizzes:", error);
    res.status(500).json({ error: "Error al obtener quizzes más populares" });
  }
});

// Obtener todas las categorías disponibles
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

export default router;
