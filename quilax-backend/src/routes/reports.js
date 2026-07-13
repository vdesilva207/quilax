import express from "express";
import { auth, roleMiddleware } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Reportar un quiz
router.post("/quiz/:quizId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const quizId = parseInt(req.params.quizId);
    const { reason, description } = req.body;

    const validReasons = ["INAPPROPRIATE_CONTENT", "COPYRIGHT", "SPAM", "HARASSMENT", "OTHER"];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: "Razón inválida" });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId }
    });

    if (!quiz) {
      return res.status(404).json({ error: "Quiz no encontrado" });
    }

    // Verificar si el usuario ya reportó este quiz
    const existingReport = await prisma.quizReport.findFirst({
      where: {
        quizId,
        reporterId: userId
      }
    });

    if (existingReport) {
      return res.status(400).json({ error: "Ya has reportado este quiz" });
    }

    const report = await prisma.quizReport.create({
      data: {
        quizId,
        reporterId: userId,
        reason,
        description
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        reporter: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Quiz reportado exitosamente",
      report
    });
  } catch (error) {
    console.error("Error reporting quiz:", error);
    res.status(500).json({ error: "Error al reportar quiz" });
  }
});

// Obtener reportes de un quiz (admin)
router.get("/quiz/:quizId", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const quizId = parseInt(req.params.quizId);

    const reports = await prisma.quizReport.findMany({
      where: { quizId },
      include: {
        reporter: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error("Error getting quiz reports:", error);
    res.status(500).json({ error: "Error al obtener reportes" });
  }
});

// Obtener todos los reportes pendientes (admin)
router.get("/pending", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const reports = await prisma.quizReport.findMany({
      where: { status: "PENDING" },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            creator: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reporter: {
          select: {
            id: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error("Error getting pending reports:", error);
    res.status(500).json({ error: "Error al obtener reportes pendientes" });
  }
});

// Revisar reporte (admin)
router.put("/:reportId/review", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const { status, action } = req.body;

    const validStatuses = ["PENDING", "APPROVED", "REJECTED", "RESOLVED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Estado inválido" });
    }

    const report = await prisma.quizReport.update({
      where: { id: reportId },
      data: {
        status,
        reviewedAt: new Date()
      },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    // Si se aprueba el reporte y la acción es eliminar el quiz
    if (status === "APPROVED" && action === "DELETE_QUIZ") {
      await prisma.quiz.update({
        where: { id: report.quizId },
        data: { status: "CANCELLED" }
      });
    }

    res.json({
      success: true,
      message: "Reporte revisado exitosamente",
      report
    });
  } catch (error) {
    console.error("Error reviewing report:", error);
    res.status(500).json({ error: "Error al revisar reporte" });
  }
});

// Obtener reportes del usuario actual
router.get("/my-reports", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const reports = await prisma.quizReport.findMany({
      where: { reporterId: userId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({
      success: true,
      reports
    });
  } catch (error) {
    console.error("Error getting my reports:", error);
    res.status(500).json({ error: "Error al obtener mis reportes" });
  }
});

export default router;
