import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuración de métricas personalizadas
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up a 100 usuarios
    { duration: '5m', target: 500 },  // Ramp up a 500 usuarios
    { duration: '10m', target: 1000 }, // Ramp up a 1000 usuarios
    { duration: '5m', target: 1000 }, // Mantener 1000 usuarios
    { duration: '5m', target: 500 },  // Ramp down a 500 usuarios
    { duration: '2m', target: 0 },    // Ramp down a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% de requests < 500ms, 99% < 1000ms
    http_req_failed: ['rate<0.01'], // Menos del 1% de errores
  },
};

const BASE_URL = 'http://localhost:3001';

// Función para crear un usuario de prueba
function createUser() {
  const randomEmail = `testuser${Math.random().toString(36).substring(7)}@test.com`;
  const payload = JSON.stringify({
    email: randomEmail,
    password: 'TestPassword123!',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/register`, payload, params);
  
  check(res, {
    'user created': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);

  return res.status === 201 || res.status === 200 ? randomEmail : null;
}

// Función para login
function loginUser(email) {
  const payload = JSON.stringify({
    email: email,
    password: 'TestPassword123!',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);
  
  check(res, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  return res.status === 200 ? JSON.parse(res.body).token : null;
}

// Función para crear un quiz
function createQuiz(token) {
  const payload = JSON.stringify({
    title: `Quiz Test ${Math.random().toString(36).substring(7)}`,
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
      {
        text: '¿Cuánto es 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctOption: 1,
        questionReadDuration: 10,
        questionAnswerDuration: 30,
        questionType: 'multiple_choice',
        points: 100,
      },
      {
        text: '¿Cuál es el planeta más grande del sistema solar?',
        options: ['Marte', 'Júpiter', 'Saturno', 'Venus'],
        correctOption: 1,
        questionReadDuration: 10,
        questionAnswerDuration: 30,
        questionType: 'multiple_choice',
        points: 100,
      },
      {
        text: '¿En qué año llegó el hombre a la luna?',
        options: ['1965', '1969', '1972', '1975'],
        correctOption: 1,
        questionReadDuration: 10,
        questionAnswerDuration: 30,
        questionType: 'multiple_choice',
        points: 100,
      },
      {
        text: '¿Cuál es el elemento químico con símbolo H?',
        options: ['Helio', 'Hidrógeno', 'Hafnio', 'Holmio'],
        correctOption: 1,
        questionReadDuration: 10,
        questionAnswerDuration: 30,
        questionType: 'multiple_choice',
        points: 100,
      },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/quiz-creation/`, payload, params);
  
  check(res, {
    'quiz created': (r) => r.status === 200 || r.status === 201,
  }) || errorRate.add(1);

  return res.status === 200 || res.status === 201 ? JSON.parse(res.body).id : null;
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
  }) || errorRate.add(1);
}

// Función para unirse a un quiz
function joinQuiz(token, quizId) {
  const payload = JSON.stringify({
    quizId: quizId,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/quiz/${quizId}/join`, payload, params);
  
  check(res, {
    'joined quiz': (r) => r.status === 200 || r.status === 201,
  }) || errorRate.add(1);
}

// Función para enviar respuestas de quiz
function submitQuizAnswers(token, quizId) {
  const payload = JSON.stringify({
    answers: [
      { questionId: 1, answer: 'París' },
      { questionId: 2, answer: '4' },
      { questionId: 3, answer: 'Júpiter' },
      { questionId: 4, answer: '1969' },
      { questionId: 5, answer: 'Hidrógeno' },
    ],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/quiz/${quizId}/submit`, payload, params);
  
  check(res, {
    'answers submitted': (r) => r.status === 200 || r.status === 201,
  }) || errorRate.add(1);
}

export default function () {
  // Crear usuario y hacer login (solo en la primera iteración)
  const email = createUser();
  if (email) {
    const token = loginUser(email);
    
    if (token) {
      // Crear un quiz
      const quizId = createQuiz(token);
      
      // Simular comportamiento de usuario
      getQuizzes(token);
      sleep(1);
      
      if (quizId) {
        joinQuiz(token, quizId);
        sleep(2);
        
        submitQuizAnswers(token, quizId);
      }
      
      // Simular más requests
      getQuizzes(token);
      sleep(1);
      getQuizzes(token);
      sleep(1);
    }
  }
  
  sleep(2);
}
