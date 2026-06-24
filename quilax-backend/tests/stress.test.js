import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 500 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
};

const RUN_ID = 1; // cambia esto

export default function () {
  const url = `http://localhost:3000/quiz-run/${RUN_ID}/answer`;

  const payload = JSON.stringify({
    questionId: 1,
    answer: "A",
    responseTimeMs: 1200,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': Math.floor(Math.random() * 500000), // simula 500k usuarios
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200 or valid response': (r) => r.status < 500,
  });

  sleep(0.01); // simula comportamiento humano
}