import prisma from "../lib/prisma.js";
import { sendNotification } from "./notificationService.js";
import { getIO } from "../socket.js";

/*
====================================
ADMIN INBOX (QUIZZES PENDING)
====================================
*/
export async function getAdminInbox() {
  return prisma.quiz.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      creator: true,
      questions: true,
      rewardRules: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

/*
====================================
NOTIFY REJECTED
====================================
*/
export async function notifyQuizRejected(quiz, message) {
  const notification = await sendNotification(
    quiz.creatorId,
    "QUIZ_REJECTED",
    "Tu quiz ha sido rechazado",
    message || "Revisa las normas",
    { quizId: quiz.id }
  );

  try {
    const io = getIO();
    io.to(`user:${quiz.creatorId}`).emit("quiz:rejected", {
      quiz,
      message,
    });
  } catch (err) {
    console.error("socket error:", err);
  }

  return notification;
}

/*
====================================
NOTIFY APPROVED
====================================
*/
export async function notifyQuizApproved(quiz) {
  const notification = await sendNotification(
    quiz.creatorId,
    "QUIZ_APPROVED",
    "Tu quiz ha sido aprobado",
    "Ya está programado",
    { quizId: quiz.id }
  );

  try {
    const io = getIO();
    io.to(`user:${quiz.creatorId}`).emit("quiz:approved", quiz);
  } catch (err) {
    console.error("socket error:", err);
  }

  return notification;
}