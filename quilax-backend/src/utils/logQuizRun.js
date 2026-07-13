import fs from "fs";
import path from "path";
import chalk from "chalk"; // para colores en terminal

// Carpeta de logs (crea si no existe)
const LOG_DIR = path.resolve("./logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const LOG_FILE = path.join(LOG_DIR, "quizRun.log");

/**
 * Función de logging central para quizRuns
 */
export function logQuizRun({
  quizRunId,
  userId,
  event,
  stateBefore,
  stateAfter,
  extra = {}
}) {
  const timestamp = new Date().toISOString();

  // Objeto completo
  const logObj = {
    type: "quizRun",
    quizRunId,
    userId,
    event,
    stateBefore,
    stateAfter,
    ...extra,
    timestamp,
  };

  // 1️⃣ Mostrar en terminal con colores
  let color = chalk.white;
  if (event.includes("CREATED")) color = chalk.blue;
  else if (event.includes("STARTED")) color = chalk.green;
  else if (event.includes("STATE_CHANGE")) color = chalk.yellow;
  else if (event.includes("FINISHED")) color = chalk.magenta;

  console.log(color(`[quizRun][${timestamp}]`), logObj);

  // 2️⃣ Guardar en archivo
  fs.appendFileSync(LOG_FILE, JSON.stringify(logObj) + "\n", "utf8");
}