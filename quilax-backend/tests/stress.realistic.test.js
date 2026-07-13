import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    players: {
      executor: "ramping-arrival-rate",
      startRate: 50,          // empieza suave
      timeUnit: "1s",
      preAllocatedVUs: 2000,
      maxVUs: 20000,

      stages: [
        { target: 500, duration: "30s" },
        { target: 2000, duration: "1m" },
        { target: 5000, duration: "2m" },
        { target: 8000, duration: "2m" },
      ],
    },
  },
};

export default function () {
  const quizRunId = 1;

  const payload = JSON.stringify({
    quizRunId,
    questionId: 1,
    userId: Math.floor(Math.random() * 50000),
    answer: "A",
    responseTimeMs: Math.floor(Math.random() * 2000),
  });

  const res = http.post(
    `http://localhost:3000/quiz-run/${quizRunId}/answer`,
    payload,
    { headers: { "Content-Type": "application/json" } }
  );

  check(res, {
    "status ok": (r) => r.status === 200,
  });

  // 🔥 simula usuarios reales (NO spam continuo)
  sleep(Math.random() * 3);
}