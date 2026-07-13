import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuración de métricas personalizadas
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Scenario 1: Simular carga alta progresiva (versión local)
    high_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Ramp up a 100 usuarios
        { duration: '3m', target: 500 },    // Ramp up a 500 usuarios
        { duration: '5m', target: 1000 },   // Ramp up a 1K usuarios
        { duration: '5m', target: 1000 },   // Mantener 1K usuarios
        { duration: '3m', target: 500 },    // Ramp down a 500 usuarios
        { duration: '2m', target: 0 },      // Ramp down a 0
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = 'http://localhost:3001';

// Función para crear usuario y obtener token
function createAndLoginUser() {
  const randomEmail = `massive${Math.random().toString(36).substring(7)}@test.com`;
  
  // Registro
  const registerPayload = JSON.stringify({
    email: randomEmail,
    password: 'TestPassword123!',
  });

  const registerParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post(`${BASE_URL}/auth/register`, registerPayload, registerParams);
  
  // Login
  const loginPayload = JSON.stringify({
    email: randomEmail,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, registerParams);
  
  return loginRes.status === 200 ? JSON.parse(loginRes.body).token : null;
}

// Función para obtener quizzes
function getQuizzes(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/quizzes`, params);
  
  check(res, {
    'quizzes retrieved': (r) => r.status === 200,
    'quizzes response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
}

// Función para obtener perfil de usuario
function getUserProfile(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/user/profile`, params);
  
  check(res, {
    'profile retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Función para obtener mensajes
function getMessages(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/messages`, params);
  
  check(res, {
    'messages retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
}

export default function () {
  const token = createAndLoginUser();
  
  if (!token) {
    return;
  }

  // Simular comportamiento de usuario real
  getQuizzes(token);
  sleep(0.5);
  
  getUserProfile(token);
  sleep(0.3);
  
  getMessages(token);
  sleep(0.3);
  
  getQuizzes(token);
  sleep(0.5);
  
  // Simular más actividad
  for (let i = 0; i < 3; i++) {
    getQuizzes(token);
    sleep(0.2);
  }
  
  sleep(1);
}
