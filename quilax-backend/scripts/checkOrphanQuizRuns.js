import fs from "fs";
import path from "path";

// Ruta del archivo de logs
const LOG_FILE = path.resolve("./logs/quizRun.log");

if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, "", "utf8");

// Leer logs
const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);

// Guardar estados por quizRunId
const quizRunStates = {};

// Recorrer cada línea
for (const line of lines) {
  try {
    const log = JSON.parse(line);
    const { quizRunId, event } = log;

    if (!quizRunStates[quizRunId]) {
      quizRunStates[quizRunId] = [];
    }

    quizRunStates[quizRunId].push(event);
  } catch (err) {
    console.error("Error parseando línea:", line, err);
  }
}

// Detectar huérfanos (sin FINISHED)
const orphanQuizRuns = [];

for (const [quizRunId, events] of Object.entries(quizRunStates)) {
  if (!events.includes("FINISHED")) {
    orphanQuizRuns.push({ quizRunId, events });
  }
}

// Mostrar resultado
if (orphanQuizRuns.length === 0) {
  console.log("✅ No hay quizRuns huérfanos");
} else {
  console.log("⚠️ QuizRuns huérfanos detectados:");
  orphanQuizRuns.forEach(qr => {
    console.log(`- QuizRun ${qr.quizRunId}:`, qr.events.join(" -> "));
  });
}
