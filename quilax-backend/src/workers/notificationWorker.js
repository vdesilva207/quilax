import prisma from "../lib/prisma.js";
import { notifyQuizCountdown } from "../services/notificationService.js";

const TIMES = [
  { label: "2 días", ms: 48 * 60 * 60 * 1000 },
  { label: "1 día", ms: 24 * 60 * 60 * 1000 },
  { label: "2 horas", ms: 2 * 60 * 60 * 1000 },
  { label: "1 hora", ms: 60 * 60 * 1000 },
  { label: "30 minutos", ms: 30 * 60 * 1000 },
  { label: "10 minutos", ms: 10 * 60 * 1000 },
  { label: "5 minutos", ms: 5 * 60 * 1000 },
  { label: "1 minuto", ms: 60 * 1000 },
];

async function processCountdowns() {
  const now = new Date();

  const quizzes = await prisma.quiz.findMany({
    where: {
      status: "SCHEDULED",
      schedules: {
        some: {
          scheduledAt: { gt: now },
        },
      },
    },
    include: {
      enrollments: true,
      schedules: true,
    },
  });

  for (const quiz of quizzes) {
    if (!quiz.schedules.length) continue;

    const scheduledAt = quiz.schedules[0].scheduledAt;
    const startTime = new Date(scheduledAt).getTime();

    for (const time of TIMES) {
      const triggerTime = startTime - time.ms;
      const diff = Math.abs(now.getTime() - triggerTime);

      if (diff < 5000) {
        for (const enrollment of quiz.enrollments) {
          await notifyQuizCountdown(
            enrollment.userId,
            quiz.id,
            quiz.title,
            time.label
          );
        }
      }
    }
  }
}

export function startNotificationWorker() {
  console.log("🔔 Notification worker iniciado");

  setInterval(async () => {
    try {
      await processCountdowns();
    } catch (err) {
      console.error("❌ Error en notification worker:", err);
    }
  }, 5000);
}