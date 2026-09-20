import prisma from "../lib/prisma.js";
import { calculateQuizSimilarity } from "./quizHashService.js";
import { getIO } from "../socket.js";
import { canPublishQuiz } from "../utils/quizValidationService.js";

export async function publishQuiz(userId, quizId, scheduledAt) {
  if (!userId) throw new Error("Unauthorized");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: true,
    },
  });

  if (!quiz || quiz.creatorId !== userId) {
    throw new Error("No autorizado");
  }

  if (!["DRAFT", "REJECTED"].includes(quiz.status)) {
    throw new Error("No se puede publicar");
  }

  // ✅ Validar fecha: mínimo 14 días desde ahora (regla de creadores)
  const MIN_LEAD_MS = 14 * 24 * 60 * 60 * 1000;
  const date = new Date(scheduledAt);
  const earliest = new Date(Date.now() + MIN_LEAD_MS);
  if (!scheduledAt || isNaN(date.getTime())) {
    throw new Error("Fecha inválida");
  }
  if (date.getTime() < earliest.getTime()) {
    throw new Error(
      "Solo puedes fechar el quiz a partir de 14 días desde ahora",
    );
  }

  // 🎯 VALIDAR REGLAS DE QUIZ (TIEMPO Y PREGUNTAS)
  const validation = canPublishQuiz(quiz);
  
  if (!validation.canPublish) {
    const errorMessage = validation.reasons.join('. ');
    throw new Error(`No se puede publicar el quiz: ${errorMessage}`);
  }

  // Socket opcional
  let io = null;
  try {
    io = getIO();
  } catch {}

  // Soft similarity warning vs other quizzes by same creator (no contentHash in schema)
  const fullQuiz = {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({ text: q.text, answers: [] })),
  };
  const userQuizzes = await prisma.quiz.findMany({
    where: { creatorId: userId, id: { not: quizId } },
    include: { questions: true },
  });
  for (const q of userQuizzes) {
    const sim = calculateQuizSimilarity(fullQuiz, {
      title: q.title,
      questions: q.questions.map((qq) => ({ text: qq.text })),
    });
    if (sim > 0.85) {
      console.warn("Quiz muy similar", { quizId, otherId: q.id, similarity: sim });
    }
  }

  // Slot check: one quiz per minute
  const slotTaken = await prisma.quizSchedule.findFirst({
    where: {
      scheduledAt: {
        gte: date,
        lt: new Date(date.getTime() + 60000),
      },
    },
  });
  if (slotTaken) {
    throw new Error("Ya hay un quiz en ese minuto");
  }

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      status: "PENDING_REVIEW",
      schedules: {
        create: {
          scheduledAt: date,
        },
      },
    },
    include: {
      schedules: true,
    },
  });

  // Establecer quizSubmittedAt cuando se envía el quiz a revisión
  await prisma.user.update({
    where: { id: userId },
    data: {
      quizSubmittedAt: new Date(),
    },
  });

  if (io) {
    io.to(`user:${userId}`).emit("quiz:submitted", updated);
  }

  return updated;
}