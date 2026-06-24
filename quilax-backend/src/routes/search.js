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
          scheduledAt: { lte: new Date() },
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } }
          ]
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
              quizRuns: true
            }
          }
        },
        take: searchLimit
      });

      // Separar quizzes jugados y no jugados por el usuario
      const userQuizRuns = await prisma.quizRun.findMany({
        where: { userId },
        select: { quizId: true }
      });
      const playedQuizIds = new Set(userQuizRuns.map(r => r.quizId));

      results.quizzes = quizzes.map(quiz => ({
        ...quiz,
        played: playedQuizIds.has(quiz.id)
      })).sort((a, b) => (a.played === b.played) ? 0 : a.played ? 1 : -1);
    }

    // Buscar categorías
    if (!type || type === "categories") {
      const allQuizzes = await prisma.quiz.findMany({
        where: {
          status: "PUBLISHED",
          category: { contains: q, mode: "insensitive" }
        },
        select: { category: true }
      });

      const categoryCounts = {};
      allQuizzes.forEach(quiz => {
        if (quiz.category) {
          categoryCounts[quiz.category] = (categoryCounts[quiz.category] || 0) + 1;
        }
      });

      results.categories = Object.entries(categoryCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, searchLimit);
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
              quizzes: true
            }
          }
        },
        take: searchLimit
      });

      results.users = users;
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
        scheduledAt: { lte: new Date() },
        category: { in: categories }
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
            quizRuns: true
          }
        }
      }
    });

    // Separar quizzes jugados y no jugados por el usuario
    const userQuizRuns = await prisma.quizRun.findMany({
      where: { userId },
      select: { quizId: true }
    });
    const playedQuizIds = new Set(userQuizRuns.map(r => r.quizId));

    const filteredQuizzes = quizzes.map(quiz => ({
      ...quiz,
      played: playedQuizIds.has(quiz.id)
    })).sort((a, b) => (a.played === b.played) ? 0 : a.played ? 1 : -1);

    res.json({
      success: true,
      quizzes: filteredQuizzes
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
      take: limit
    });

    res.json({
      success: true,
      quizzes: newestQuizzes
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
      take: limit
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

// Obtener todas las categorías disponibles
router.get("/categories", async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
        category: { not: null }
      },
      select: { category: true }
    });

    const categoryCounts = {};
    quizzes.forEach(quiz => {
      if (quiz.category) {
        categoryCounts[quiz.category] = (categoryCounts[quiz.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ error: "Error al obtener categorías" });
  }
});

export default router;
