import { Router } from "express";
import prisma from "../lib/prisma.js";
import { auth, roleMiddleware } from "../middleware/auth.js";

const router = Router();

/*
====================================
MIDDLEWARE GLOBAL ADMIN
====================================
*/
router.use(auth);
router.use(roleMiddleware(["ADMIN", "ADMIN_WORKER"]));

/*
====================================
VALIDAR REPARTO (100%)
====================================
*/
async function validateRewardDistribution(quizId) {
  const rules = await prisma.rewardRule.findMany({
    where: { quizId },
  });

  let total = 5; // 👈 5% JACKPOT obligatorio

  for (const rule of rules) {
    if (rule.type === "POSITION") {
      const count = rule.positionTo - rule.positionFrom + 1;
      total += Number(rule.percent) * count;
    } else {
      total += Number(rule.percent);
    }
  }

  const rounded = Math.round(total * 1000) / 1000;

  return {
    totalPercent: rounded,
    isValid: rounded === 100,
  };
}

/*
====================================
GET PENDIENTES
====================================
*/
router.get("/", async (req, res) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: {
        creator: { select: { id: true, email: true, username: true } },
        schedules: { orderBy: { scheduledAt: "asc" }, take: 1 },
        _count: { select: { questions: true } },
      },
    });

    res.json(quizzes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching quizzes" });
  }
});

/*
====================================
APROBAR QUIZ
====================================
*/
router.post("/:id/approve", async (req, res) => {
  const quizId = Number(req.params.id);
  const scheduledAtRaw = req.body?.scheduledAt;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return res.status(404).json({ error: "Quiz no encontrado" });

    if (!["PENDING_REVIEW", "DRAFT", "APPROVED", "SCHEDULED"].includes(quiz.status)) {
      return res.status(400).json({ error: `Quiz no se puede publicar (estado: ${quiz.status})` });
    }

    const scheduledAt = scheduledAtRaw
      ? new Date(scheduledAtRaw)
      : new Date(Date.now() + 5 * 60 * 1000);

    if (Number.isNaN(scheduledAt.getTime())) {
      return res.status(400).json({ error: "scheduledAt inválido" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.quizSchedule.deleteMany({ where: { quizId } });
      await tx.quizSchedule.create({
        data: { quizId, scheduledAt, status: "RESERVED" },
      });
      return tx.quiz.update({
        where: { id: quizId },
        data: { status: "PUBLISHED" },
        include: { schedules: true },
      });
    });

    res.json({ ok: true, quiz: updated, message: "Quiz publicado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Approval error" });
  }
});

/*
====================================
VERIFICAR SI USUARIO PUEDE ENVIAR MENSAJES A ADMIN
====================================
*/
router.get("/can-message-admin", async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        quizSubmittedAt: true,
        quizRejectedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const HOURS_72 = 72 * 60 * 60 * 1000; // 72 horas en milisegundos

    let canMessage = false;
    let reason = "";

    // Verificar si el usuario puede enviar mensajes a admin
    if (user.quizSubmittedAt) {
      const timeSinceSubmission = now.getTime() - user.quizSubmittedAt.getTime();
      if (timeSinceSubmission <= HOURS_72) {
        canMessage = true;
        reason = "Quiz enviado a revisión recientemente";
      }
    }

    if (user.quizRejectedAt) {
      const timeSinceRejection = now.getTime() - user.quizRejectedAt.getTime();
      if (timeSinceRejection <= HOURS_72) {
        canMessage = true;
        reason = "Quiz rechazado recientemente";
      }
    }

    res.json({
      canMessage,
      reason,
      quizSubmittedAt: user.quizSubmittedAt,
      quizRejectedAt: user.quizRejectedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error checking admin messaging permission" });
  }
});

/*
====================================
RECHAZAR QUIZ
====================================
*/
router.post("/:id/reject", async (req, res) => {
  const quizId = Number(req.params.id);
  const { message } = req.body;

  try {
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "REJECTED",
        requestedDate: null, // Liberar la fecha
      },
    });

    // Establecer quizRejectedAt cuando se rechaza el quiz
    await prisma.user.update({
      where: { id: quiz.creatorId },
      data: {
        quizRejectedAt: new Date(),
      },
    });

    // TODO: enviar mensaje inbox

    res.json({ ok: true, quiz });
  } catch {
    res.status(500).json({ error: "Reject error" });
  }
});

/*
====================================
CREAR REWARD RULE
====================================
*/
router.post("/:id/reward-rules", async (req, res) => {
  const quizId = Number(req.params.id);
  const { type, percent, positionFrom, positionTo } = req.body;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz || quiz.status !== "PENDING_REVIEW") {
      return res.status(400).json({
        error: "Solo editable en revisión",
      });
    }

    const rule = await prisma.rewardRule.create({
      data: {
        quizId,
        type,
        percent: Number(percent),
        positionFrom:
          type === "POSITION" ? Number(positionFrom) : null,
        positionTo:
          type === "POSITION" ? Number(positionTo) : null,
      },
    });

    res.json({ ok: true, rule });
  } catch {
    res.status(500).json({ error: "Creation error" });
  }
});

/*
====================================
DELETE RULE
====================================
*/
router.delete("/:quizId/reward-rules/:ruleId", async (req, res) => {
  try {
    await prisma.rewardRule.delete({
      where: { id: Number(req.params.ruleId) },
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Delete error" });
  }
});

/*
====================================
DETALLE QUIZ (revisión) — after static paths
====================================
*/
router.get("/:id", async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id || ""))) {
      return res.status(404).json({ error: "Not found" });
    }
    const quizId = Number(req.params.id);
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        creator: { select: { id: true, email: true, username: true, fullName: true } },
        schedules: { orderBy: { scheduledAt: "asc" } },
        questions: {
          orderBy: { id: "asc" },
          include: { answers: true },
        },
        rewardRules: true,
        _count: { select: { questions: true, enrollments: true } },
      },
    });
    if (!quiz) return res.status(404).json({ error: "Quiz no encontrado" });
    res.json({ quiz });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching quiz" });
  }
});

export default router;

