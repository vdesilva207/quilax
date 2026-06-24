import prisma from "../lib/prisma.js";
import {
  generateQuizHash,
  calculateQuizSimilarity,
} from "./quizHashService.js";
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

  // ✅ Validar fecha
  const date = new Date(scheduledAt);
  if (!scheduledAt || isNaN(date.getTime()) || date < new Date()) {
    throw new Error("Fecha inválida");
  }

  // 🎯 VALIDAR REGLAS DE QUIZ (TIEMPO Y PREGUNTAS)
  const validation = canPublishQuiz(quiz);
  
  if (!validation.canPublish) {
    const errorMessage = validation.reasons.join('. ');
    throw new Error(`No se puede publicar el quiz: ${errorMessage}`);
  }

  // ⚠️ ADAPTADO A TU MODELO
  const fullQuiz = {
    title: quiz.title,
    questions: quiz.questions.map((q) => ({
      text: q.text,
      answers: q.options || [], // 👈 importante según tu modelo
    })),
  };

  const hash = generateQuizHash(fullQuiz);

  // Socket opcional
  let io = null;
  try {
    io = getIO();
  } catch {}

  /*
  ====================================
  DUPLICADO EXACTO
  ====================================
  */
  const existing = await prisma.quiz.findFirst({
    where: {
      contentHash: hash,
    },
  });

  if (existing) {
    if (io) {
      io.to(`user:${userId}`).emit("quiz:duplicate", { quizId });
    }
    throw new Error("Este quiz ya existe");
  }

  /*
  ====================================
  SIMILITUD (WARNING SOLO)
  ====================================
  */
  const userQuizzes = await prisma.quiz.findMany({
    where: { creatorId: userId },
    include: { questions: true },
  });

  for (const q of userQuizzes) {
    const sim = calculateQuizSimilarity(fullQuiz, {
      title: q.title,
      questions: q.questions.map((qq) => ({
        text: qq.text,
      })),
    });

    if (sim > 0.85) {
      console.warn("⚠️ Quiz muy similar", {
        quizId,
        similarity: sim,
      });
    }
  }

  /*
  ====================================
  UPDATE QUIZ + CREAR SCHEDULE + ESTABLECER quizSubmittedAt
  ====================================
  */
  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      status: "PENDING_REVIEW",
      contentHash: hash,

      // 🔥 AQUÍ ESTÁ LA CLAVE
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