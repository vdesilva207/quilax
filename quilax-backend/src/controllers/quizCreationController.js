import * as service from "../services/quizCreationService.js";
import * as publishService from "../services/quizPublishService.js";

/*
====================================
CREAR DRAFT
====================================
*/
export async function createQuiz(req, res) {
  try {
    const quiz = await service.createDraft(req.user.id, req.body);
    res.json(quiz);
  } catch (err) {
    console.error("❌ createQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
EDITAR QUIZ
====================================
*/
export async function updateQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const quiz = await service.updateDraft(
      req.user.id,
      id,
      req.body
    );

    res.json(quiz);
  } catch (err) {
    console.error("❌ updateQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
BORRAR
====================================
*/
export async function deleteQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    await service.deleteDraft(req.user.id, id);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ deleteQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}

/*
====================================
MIS DRAFTS
====================================
*/
export async function getMyDrafts(req, res) {
  try {
    const quizzes = await service.getUserDrafts(req.user.id);
    res.json(quizzes);
  } catch (err) {
    console.error("❌ getMyDrafts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/*
====================================
PUBLICAR
====================================
*/
export async function publishQuiz(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid quiz id" });

    const quiz = await publishService.publishQuiz(
      req.user.id,
      id,
      req.body.scheduledAt
    );

    res.json(quiz);
  } catch (err) {
    console.error("❌ publishQuiz error:", err);
    res.status(400).json({ error: err.message });
  }
}