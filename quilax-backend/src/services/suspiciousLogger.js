import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("./logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const LOG_FILE = path.join(LOG_DIR, "antiCheat.log");

/**
 * Registrar actividad sospechosa
 */
export function logSuspiciousActivity({
  type,
  userId = null,
  quizRunId = null,
  ip = null,
  details = {},
}) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    userId,
    quizRunId,
    ip,
    ...details,
  };

  // Limitar a 1000 caracteres
  const safeEntry = JSON.stringify(entry).slice(0, 1000);

  try {
    fs.appendFileSync(LOG_FILE, safeEntry + "\n", "utf8");
  } catch (err) {
    console.error("❌ Error escribiendo antiCheat.log", err);
  }
}

/**
 * Tipos comunes de eventos
 */
export const SuspiciousTypes = {
  FAST_RESPONSE: "FAST_RESPONSE",
  ANSWER_OUT_OF_WINDOW: "ANSWER_OUT_OF_WINDOW",
  MULTI_ACCOUNT_IP: "MULTI_ACCOUNT_IP",
  INVALID_PHASE: "INVALID_PHASE",
  INVALID_QUESTION: "INVALID_QUESTION",
};