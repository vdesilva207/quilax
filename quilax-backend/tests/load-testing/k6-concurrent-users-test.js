import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuración de métricas personalizadas
const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    // Scenario 1: Usuarios concurrentes en quizzes
    quiz_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },  // Ramp up a 200 usuarios
        { duration: '5m', target: 500 },  // Ramp up a 500 usuarios
        { duration: '10m', target: 1000 }, // Ramp up a 1000 usuarios
        { duration: '5m', target: 1000 }, // Mantener 1000 usuarios
        { duration: '5m', target: 0 },    // Ramp down a 0
      ],
      gracefulRampDown: '30s',
    },
    // Scenario 2: Usuarios concurrentes en auth
    auth_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },  // Ramp up a 100 usuarios
        { duration: '3m', target: 300 },  // Ramp up a 300 usuarios
        { duration: '5m', target: 500 },  // Ramp up a 500 usuarios
        { duration: '3m', target: 500 },  // Mantener 500 usuarios
        { duration: '2m', target: 0 },    // Ramp down a 0
      ],
      gracefulRampDown: '30s',
    },
    // Scenario 3: Usuarios concurrentes en mensajes
    message_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up a 50 usuarios
        { duration: '3m', target: 150 },  // Ramp up a 150 usuarios
        { duration: '5m', target: 300 },  // Ramp up a 300 usuarios
        { duration: '3m', target: 300 },  // Mantener 300 usuarios
        { duration: '2m', target: 0 },    // Ramp down a 0
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
  const randomEmail = `concurrent${Math.random().toString(36).substring(7)}@test.com`;
  
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
  
  const loginPayload = JSON.stringify({
    email: randomEmail,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, registerParams);
  
  return loginRes.status === 200 ? JSON.parse(loginRes.body).token : null;
}

// Scenario 1: Usuarios en quizzes
export function quiz_users() {
  const token = createAndLoginUser();
  
  if (!token) {
    return;
  }

  // Crear quiz
  const quizPayload = JSON.stringify({
    title: `Quiz Concurrent ${Math.random().toString(36).substring(7)}`,
    category: 'Ciencias',
    difficulty: 5,
    questions: [
      {
        text: '¿Cuál es la capital de Francia?',
        options: ['Londres', 'París', 'Berlín', 'Madrid'],
        correctOption: 1,
        questionReadDuration: 10,
        questionAnswerDuration: 30,
        questionType: 'multiple_choice',
        points: 100,
      },
    ],
  });

  const quizParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const quizRes = http.post(`${BASE_URL}/quiz-creation/`, quizPayload, quizParams);
  
  check(quizRes, {
    'quiz created': (r) => r.status === 200 || r.status === 201,
  }) || errorRate.add(1);

  if (quizRes.status === 200 || quizRes.status === 201) {
    const quizId = JSON.parse(quizRes.body).id;
    
    // Obtener quizzes
    const getParams = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    
    http.get(`${BASE_URL}/quizzes`, getParams);
    sleep(0.5);
    
    // Unirse a quiz
    const joinPayload = JSON.stringify({ quizId });
    http.post(`${BASE_URL}/quiz/${quizId}/join`, joinPayload, quizParams);
    sleep(1);
    
    // Simular actividad continua
    for (let i = 0; i < 5; i++) {
      http.get(`${BASE_URL}/quizzes`, getParams);
      sleep(0.3);
    }
  }
  
  sleep(2);
}

// Scenario 2: Usuarios en auth
export function auth_users() {
  const randomEmail = `authconcurrent${Math.random().toString(36).substring(7)}@test.com`;
  
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

  const registerRes = http.post(`${BASE_URL}/auth/register`, registerPayload, registerParams);
  
  check(registerRes, {
    'register successful': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);

  sleep(0.5);

  // Login
  const loginPayload = JSON.stringify({
    email: randomEmail,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, registerParams);
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  if (loginRes.status === 200) {
    const token = JSON.parse(loginRes.body).token;
    
    // Refresh token
    const refreshParams = {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    };
    
    http.post(`${BASE_URL}/auth/refresh`, null, refreshParams);
    sleep(0.5);
    
    // Logout
    http.post(`${BASE_URL}/auth/logout`, null, refreshParams);
  }
  
  sleep(1);
}

// Scenario 3: Usuarios en mensajes
export function message_users() {
  const token = createAndLoginUser();
  
  if (!token) {
    return;
  }

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  // Obtener mensajes
  http.get(`${BASE_URL}/messages`, params);
  sleep(0.3);
  
  // Obtener conversaciones
  http.get(`${BASE_URL}/conversations`, params);
  sleep(0.3);
  
  // Enviar mensaje
  const messagePayload = JSON.stringify({
    toUserId: 1,
    content: `Mensaje concurrente ${Math.random().toString(36).substring(7)}`,
  });

  const messageParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  http.post(`${BASE_URL}/messages`, messagePayload, messageParams);
  sleep(0.5);
  
  // Crear ticket de soporte
  const ticketPayload = JSON.stringify({
    category: 'TECHNICAL',
    subject: `Ticket concurrente ${Math.random().toString(36).substring(7)}`,
    description: 'Descripción de prueba',
  });

  http.post(`${BASE_URL}/support/tickets`, ticketPayload, messageParams);
  sleep(0.5);
  
  // Obtener tickets
  http.get(`${BASE_URL}/support/tickets/my-tickets`, params);
  
  sleep(1);
}
