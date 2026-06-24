import prisma from "../lib/prisma.js";
import { getIO } from "../socket.js";

/*
====================================
NOTIFICACIÓN + REALTIME
====================================
*/
export async function sendNotification(userId, type, title, body, data = {}) {
  if (!userId || !type || !title || !body) {
    throw new Error("Datos de notificación inválidos");
  }

  const notification = await prisma.notification.create({
    data: { userId, type, title, body, data },
  });

  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", notification);
  } catch (err) {
    console.error("❌ Error emitNotification:", err);
  }

  return notification;
}

/*
====================================
GLOBAL
====================================
*/
export async function sendGlobalNotification(title, body) {
  if (!title || !body) throw new Error("Datos de notificación global inválidos");

  const users = await prisma.user.findMany({ select: { id: true } });

  for (const u of users) {
    await sendNotification(u.id, "GLOBAL", title, body);
  }
}

/*
====================================
QUIZ START
====================================
*/
export async function notifyQuizStart(run) {
  if (!run?.id) throw new Error("QuizRun inválido");

  const participants = await prisma.quizParticipant.findMany({
    where: { quizRunId: run.id },
  });

  for (const p of participants) {
    await sendNotification(
      p.userId,
      "QUIZ_START",
      "Tu quiz empieza",
      "El quiz comienza ahora",
      { quizRunId: run.id }
    );
  }
}

/*
====================================
GANADOR
====================================
*/
export async function notifyWinner(userId, credits) {
  if (!userId || !credits) throw new Error("Datos de ganador inválidos");

  return sendNotification(
    userId,
    "WIN",
    "Has ganado",
    `Has ganado ${credits} créditos`
  );
}

/*
====================================
COUNTDOWN
====================================
*/
export async function notifyQuizCountdown(userId, quizId, quizTitle, timeText) {
  if (!userId || !quizId || !quizTitle || !timeText) {
    throw new Error("Datos de countdown inválidos");
  }

  return sendNotification(
    userId,
    "QUIZ_COUNTDOWN",
    "Quiz a punto de empezar",
    `El quiz "${quizTitle}" empieza en ${timeText}`,
    { quizId, time: timeText }
  );
}