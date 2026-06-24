import { advanceExpiredQuizRuns } from "../services/quizEngine.js";

export function startQuizScheduler() {
  // Temporalmente desactivado para evitar errores de conexión a DB
  // setInterval(async () => {
  //   try {
  //     await advanceExpiredQuizRuns();
  //   } catch (err) {
  //     console.error("❌ Scheduler error:", err);
  //   }
  // }, 1000);
}
