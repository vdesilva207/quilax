import express from "express";
import {
  getInbox,
  getConversation,
  sendMessage,
  markRead,
  blockUser,
} from "../controllers/messageController.js";
import { auth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

router.use(auth);

const ADMIN_RULES_ES = [
  "Solo puedes escribir al equipo de administración en ventanas concretas (p. ej. tras enviar o rechazar un quiz).",
  "Sé claro y respetuoso; no envíes datos bancarios completos por chat.",
  "La respuesta puede tardar; no abras varios hilos sobre el mismo tema.",
];

async function computeCanMessageAdmin(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { quizSubmittedAt: true, quizRejectedAt: true },
  });
  if (!user) return { canMessage: false, reason: "", expiresAt: null };

  const now = Date.now();
  const HOURS_72 = 72 * 60 * 60 * 1000;
  let canMessage = false;
  let reason = "";
  let expiresAt = null;

  if (user.quizSubmittedAt) {
    const t = user.quizSubmittedAt.getTime();
    if (now - t <= HOURS_72) {
      canMessage = true;
      reason = "Quiz enviado a revisión recientemente";
      expiresAt = new Date(t + HOURS_72).toISOString();
    }
  }
  if (user.quizRejectedAt) {
    const t = user.quizRejectedAt.getTime();
    if (now - t <= HOURS_72) {
      canMessage = true;
      reason = "Quiz rechazado recientemente";
      const exp = new Date(t + HOURS_72).toISOString();
      if (!expiresAt || exp > expiresAt) expiresAt = exp;
    }
  }

  return { canMessage, reason, expiresAt };
}

/**
 * Admin panel aliases — BEFORE /:userId
 */
router.get("/admin-panel/status", async (req, res) => {
  try {
    const { canMessage } = await computeCanMessageAdmin(req.user.id);
    const openCount = await prisma.adminMessage.count({
      where: {
        userId: req.user.id,
        status: { in: ["UNREAD", "OPEN"] },
      },
    });
    res.json({ open: canMessage || openCount > 0, canMessage });
  } catch (error) {
    console.error("admin-panel/status error:", error);
    res.status(500).json({ error: "Error al obtener estado del panel admin" });
  }
});

router.get("/admin-panel/thread", async (req, res) => {
  try {
    const userId = req.user.id;
    const { canMessage, reason, expiresAt } = await computeCanMessageAdmin(userId);

    const messages = await prisma.adminMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    const items = messages.map((m) => ({
      id: String(m.id),
      direction: m.recipientType === "USER" ? "from_admin" : "to_admin",
      title: m.subject,
      body: m.message,
      type: "admin_message",
      createdAt: m.createdAt,
      status: m.status,
    }));

    res.json({
      messages: items,
      items,
      canMessage,
      reason,
      expiresAt,
      rules: ADMIN_RULES_ES,
    });
  } catch (error) {
    console.error("admin-panel/thread error:", error);
    res.status(500).json({ error: "Error al obtener hilo admin" });
  }
});

router.post("/admin-panel", async (req, res) => {
  try {
    const userId = req.user.id;
    const content =
      (typeof req.body?.content === "string" && req.body.content.trim()) ||
      (typeof req.body?.message === "string" && req.body.message.trim()) ||
      "";
    const subject =
      (typeof req.body?.subject === "string" && req.body.subject.trim()) ||
      "Mensaje al equipo";

    if (!content) {
      return res.status(400).json({ error: "content/message requerido" });
    }

    const { canMessage } = await computeCanMessageAdmin(userId);
    if (!canMessage) {
      return res.status(403).json({
        error: "No puedes escribir al admin en este momento",
        canMessage: false,
      });
    }

    const created = await prisma.adminMessage.create({
      data: {
        userId,
        recipientType: "ADMIN",
        subject,
        message: content,
        status: "UNREAD",
      },
    });

    res.status(201).json({
      success: true,
      message: created,
      item: {
        id: String(created.id),
        direction: "to_admin",
        title: created.subject,
        body: created.message,
        type: "admin_message",
        createdAt: created.createdAt,
        status: created.status,
      },
    });
  } catch (error) {
    console.error("admin-panel post error:", error);
    res.status(500).json({ error: "Error al enviar mensaje al admin" });
  }
});

router.get("/", getInbox);
router.get("/:userId", getConversation);
router.post("/", sendMessage);
router.post("/:userId/read", markRead);
router.post("/:userId/block", blockUser);

export default router;
