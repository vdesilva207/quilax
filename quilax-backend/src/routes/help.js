import express from "express";
import { auth, roleMiddleware } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { findSimilarHelpArticles, createHelpArticleFromTicket } from "../services/ticketSimilarityService.js";

const router = express.Router();

// Buscar artículos de ayuda
router.get("/search", auth, async (req, res) => {
  try {
    const query = req.query.q || "";
    const category = req.query.category;

    if (!query) {
      return res.status(400).json({ error: "Query es requerido" });
    }

    // Buscar artículos similares
    const similarArticles = await findSimilarHelpArticles(query, 0.4); // Threshold más bajo para búsqueda

    // Filtrar por categoría si se especifica
    let filteredArticles = similarArticles;
    if (category) {
      filteredArticles = similarArticles.filter(article => article.category === category);
    }

    // Incrementar views
    for (const article of filteredArticles) {
      await prisma.helpArticle.update({
        where: { id: article.articleId },
        data: { views: { increment: 1 } }
      });
    }

    res.json({
      success: true,
      articles: filteredArticles
    });
  } catch (error) {
    console.error("Error searching help articles:", error);
    res.status(500).json({ error: "Error al buscar artículos de ayuda" });
  }
});

// Obtener todos los artículos de ayuda (públicos)
router.get("/articles", async (req, res) => {
  try {
    const category = req.query.category;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const where = {};
    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      prisma.helpArticle.findMany({
        where,
        orderBy: { views: "desc" },
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true
            }
          }
        }
      }),
      prisma.helpArticle.count({ where })
    ]);

    res.json({
      success: true,
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error getting help articles:", error);
    res.status(500).json({ error: "Error al obtener artículos de ayuda" });
  }
});

// Obtener detalle de un artículo
router.get("/articles/:id", async (req, res) => {
  try {
    const articleId = Number(req.params.id);

    const article = await prisma.helpArticle.findUnique({
      where: { id: articleId },
      include: {
        creator: {
          select: {
            id: true,
            fullName: true
          }
        }
      }
    });

    if (!article) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }

    // Incrementar views
    await prisma.helpArticle.update({
      where: { id: articleId },
      data: { views: { increment: 1 } }
    });

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error("Error getting help article:", error);
    res.status(500).json({ error: "Error al obtener artículo de ayuda" });
  }
});

// Votar si el artículo fue útil
router.post("/articles/:id/vote", auth, async (req, res) => {
  try {
    const articleId = Number(req.params.id);
    const { helpful } = req.body; // true o false

    if (typeof helpful !== "boolean") {
      return res.status(400).json({ error: "helpful debe ser true o false" });
    }

    const article = await prisma.helpArticle.findUnique({
      where: { id: articleId }
    });

    if (!article) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }

    if (helpful) {
      await prisma.helpArticle.update({
        where: { id: articleId },
        data: { helpful: { increment: 1 } }
      });
    } else {
      await prisma.helpArticle.update({
        where: { id: articleId },
        data: { notHelpful: { increment: 1 } }
      });
    }

    res.json({
      success: true,
      message: "Voto registrado"
    });
  } catch (error) {
    console.error("Error voting on help article:", error);
    res.status(500).json({ error: "Error al registrar voto" });
  }
});

// Crear artículo de ayuda (admin)
router.post("/articles", auth, roleMiddleware(["ADMIN", "ADMIN_WORKER"]), async (req, res) => {
  try {
    const createdBy = req.user.id;
    const { question, answer, category, keywords, ticketId } = req.body;

    if (!question || !answer || !category) {
      return res.status(400).json({ error: "question, answer y category son requeridos" });
    }

    let article;
    if (ticketId) {
      // Crear desde ticket
      article = await createHelpArticleFromTicket(ticketId, answer, category, keywords, createdBy);
    } else {
      // Crear manualmente
      article = await prisma.helpArticle.create({
        data: {
          question,
          answer,
          category,
          keywords,
          createdBy,
          relatedTickets: []
        }
      });
    }

    res.json({
      success: true,
      message: "Artículo de ayuda creado",
      article
    });
  } catch (error) {
    console.error("Error creating help article:", error);
    res.status(500).json({ error: "Error al crear artículo de ayuda" });
  }
});

// Actualizar artículo de ayuda (admin)
router.put("/articles/:id", auth, roleMiddleware(["ADMIN", "ADMIN_WORKER"]), async (req, res) => {
  try {
    const articleId = Number(req.params.id);
    const { question, answer, category, keywords } = req.body;

    const article = await prisma.helpArticle.update({
      where: { id: articleId },
      data: {
        question,
        answer,
        category,
        keywords
      }
    });

    res.json({
      success: true,
      message: "Artículo de ayuda actualizado",
      article
    });
  } catch (error) {
    console.error("Error updating help article:", error);
    res.status(500).json({ error: "Error al actualizar artículo de ayuda" });
  }
});

// Eliminar artículo de ayuda (admin)
router.delete("/articles/:id", auth, roleMiddleware(["ADMIN", "ADMIN_WORKER"]), async (req, res) => {
  try {
    const articleId = Number(req.params.id);

    await prisma.helpArticle.delete({
      where: { id: articleId }
    });

    res.json({
      success: true,
      message: "Artículo de ayuda eliminado"
    });
  } catch (error) {
    console.error("Error deleting help article:", error);
    res.status(500).json({ error: "Error al eliminar artículo de ayuda" });
  }
});

// Obtener categorías de ayuda
router.get("/categories", async (req, res) => {
  try {
    const articles = await prisma.helpArticle.findMany({
      select: { category: true },
      distinct: ["category"]
    });

    const categories = articles.map(a => a.category);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("Error getting help categories:", error);
    res.status(500).json({ error: "Error al obtener categorías de ayuda" });
  }
});

export default router;
