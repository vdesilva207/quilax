import { advanceExpiredQuizRuns } from "../services/quizEngine.js";

let schedulerInterval = null;

export function startQuizScheduler() {
  if (schedulerInterval) {
    console.log("⚠️ Quiz scheduler already running");
    return;
  }

  console.log("🔄 Starting quiz scheduler...");

  // Ejecutar cada segundo para avanzar fases de quizzes en tiempo real
  schedulerInterval = setInterval(async () => {
    try {
      await advanceExpiredQuizRuns();
    } catch (err) {
      console.error("❌ Scheduler error:", err);
    }
  }, 1000);

  console.log("✅ Quiz scheduler started (runs every 1 second)");
}

export function stopQuizScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏹️ Quiz scheduler stopped");
  }
}
