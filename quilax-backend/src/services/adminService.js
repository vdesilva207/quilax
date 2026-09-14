import prisma from "../lib/prisma.js";

/*
====================================
GET QUIZZES CON FILTROS
====================================
*/
export async function getQuizzes(filters) {
  const where = {};

  if (filters.status) where.status = filters.status;
  if (filters.creatorId) where.creatorId = Number(filters.creatorId);

  if (filters.scheduled !== undefined) {
    where.schedules = filters.scheduled
      ? { some: {} }
      : { none: {} };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
    }
  }

  return prisma.quiz.findMany({
    where,
    include: {
      creator: {
        select: { id: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/*
====================================
GET QUIZ DETALLE COMPLETO
====================================
*/
export async function getQuizById(id) {
  return prisma.quiz.findUnique({
    where: { id },
    include: {
      creator: true,
      questions: true,
      rewardRules: true,
      quizRuns: true,
    },
  });
}

/*
====================================
VALIDAR SLOT (1 QUIZ / MINUTO)
====================================
*/
export async function validateMinuteSlot(date) {
  const existing = await prisma.quizSchedule.findFirst({
    where: {
      scheduledAt: {
        gte: date,
        lt: new Date(date.getTime() + 60000),
      },
    },
  });

  if (existing) {
    throw new Error("Ya hay un quiz en ese minuto");
  }
}

/*
====================================
APROBAR QUIZ COMPLETO
====================================
*/
export async function approveQuiz(quizId, scheduledAt) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) throw new Error("Quiz no encontrado");

  if (quiz.status !== "PENDING_REVIEW") {
    throw new Error("Quiz ya procesado");
  }

  const date = new Date(scheduledAt);

  await validateMinuteSlot(date);

  return prisma.quiz.update({
    where: { id: quizId },
    data: {
      status: "PUBLISHED",
      schedules: {
        create: { scheduledAt: date },
      },
    },
    include: { schedules: true },
  });
}

/*
====================================
REJECT
====================================
*/
export async function rejectQuiz(quizId, message) {
  const quiz = await prisma.quiz.update({
    where: { id: quizId },
    data: { status: "REJECTED" },
  });

  return quiz;
}

/*
====================================
CANCEL QUIZ
====================================
*/
export async function cancelQuiz(quizId) {
  return prisma.quiz.update({
    where: { id: quizId },
    data: { status: "REJECTED" },
  });
}