import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

/**
 * GET quizzes públicos
 */
router.get("/", async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(quizzes);
  } catch (err) {
    console.error("❌ Error fetching quizzes", err);
    res.status(500).json({ error: "Error fetching quizzes" });
  }
});

/**
 * GET quiz por id
 */
router.get("/:id", async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        questions: true,
      },
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json(quiz);
  } catch (err) {
    console.error("❌ Error fetching quiz", err);
    res.status(500).json({ error: "Error fetching quiz" });
  }
});

export default router;
