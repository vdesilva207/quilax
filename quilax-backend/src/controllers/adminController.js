import * as service from "../services/adminService.js";
import { logAdminAction } from "../services/adminLogService.js";
import {
  notifyQuizApproved,
  notifyQuizRejected,
  getAdminInbox,
} from "../services/adminInboxService.js";

/*
====================================
GET ADMIN INBOX
====================================
*/
export async function getInbox(req, res) {
  try {
    const inbox = await getAdminInbox();
    res.json(inbox);
  } catch (err) {
    console.error("❌ getInbox error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
GET QUIZZES (ADMIN LIST)
====================================
*/
export async function getQuizzes(req, res) {
  try {
    const quizzes = await service.getQuizzes(req.query);
    res.json(quizzes);
  } catch (err) {
    console.error("❌ getQuizzes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
GET QUIZ DETALLE
====================================
*/
export async function getQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const quiz = await service.getQuizById(id);
    res.json(quiz);
  } catch (err) {
    console.error("❌ getQuiz error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
APPROVE QUIZ
====================================
*/
export async function approveQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: "scheduledAt required" });
    }

    const quiz = await service.approveQuiz(id, scheduledAt);

    await notifyQuizApproved(quiz);

    await logAdminAction(
      req.user?.id || 0,
      "APPROVE_QUIZ",
      "QUIZ",
      quiz.id
    );

    res.json({ ok: true, quiz });
  } catch (err) {
    console.error("❌ approveQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
REJECT QUIZ
====================================
*/
export async function rejectQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const { message } = req.body;

    const quiz = await service.rejectQuiz(id, message);

    await notifyQuizRejected(quiz, message);

    await logAdminAction(
      req.user?.id || 0,
      "REJECT_QUIZ",
      "QUIZ",
      quiz.id
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ rejectQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
CANCEL QUIZ
====================================
*/
export async function cancelQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const quiz = await service.cancelQuiz(id);

    await logAdminAction(
      req.user?.id || 0,
      "CANCEL_QUIZ",
      "QUIZ",
      quiz.id
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ cancelQuiz error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
