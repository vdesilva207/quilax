// testMultipleQuizRuns.js
import { io as ClientIO } from "socket.io-client";
import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000"; // Ajusta si tu backend corre en otro puerto
const QUIZ_IDS = [2, 2]; // IDs de los quizzes que quieras iniciar

const sockets = [];

async function startQuizRun(quizId) {
  const res = await fetch(`${BASE_URL}/quiz/run/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quizId }),
  });
  const data = await res.json();
  return data;
}

function connectSocket(quizRunId) {
  const socket = ClientIO(BASE_URL);

  socket.on("connect", () => {
    console.log(`🟢 Socket conectado para quizRun ${quizRunId} - ID: ${socket.id}`);
    socket.emit("joinQuiz", `quiz-${quizRunId}`);
  });

  socket.on("quiz:state", (state) => {
    console.log(`➡️ Estado quizRun ${quizRunId}:`, {
      phase: state.phase,
      currentIndex: state.currentIndex,
      question: state.question ? state.question.text : null,
      phaseEndsAt: state.phaseEndsAt,
    });
  });

  socket.on("quiz:finished", (state) => {
    console.log(`🏁 QuizRun ${quizRunId} finalizado`);
  });

  sockets.push(socket);
}

async function main() {
  for (const quizId of QUIZ_IDS) {
    const run = await startQuizRun(quizId);
    console.log(`🎮 QuizRun iniciado:`, run.id);
    connectSocket(run.id);
  }
}

main();
