import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Configuración de métricas personalizadas
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up a 50 usuarios
    { duration: '3m', target: 200 },  // Ramp up a 200 usuarios
    { duration: '5m', target: 500 },  // Ramp up a 500 usuarios
    { duration: '3m', target: 500 },  // Mantener 500 usuarios
    { duration: '2m', target: 100 },  // Ramp down a 100 usuarios
    { duration: '1m', target: 0 },    // Ramp down a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<300', 'p(99)<500'], // Auth debe ser rápido
    http_req_failed: ['rate<0.02'], // Menos del 2% de errores
  },
};

const BASE_URL = 'http://localhost:3001';

// Función para registrar usuario
function registerUser() {
  const randomEmail = `loadtest${Math.random().toString(36).substring(7)}@test.com`;
  const randomPassword = 'TestPassword123!';
  
  const payload = JSON.stringify({
    email: randomEmail,
    password: randomPassword,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/register`, payload, params);
  
  check(res, {
    'register successful': (r) => r.status === 201 || r.status === 200,
    'register response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  return res.status === 201 || res.status === 200 ? { email: randomEmail, password: randomPassword } : null;
}

// Función para login
function loginUser(email, password) {
  const payload = JSON.stringify({
    email: email,
    password: password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/login`, payload, params);
  
  check(res, {
    'login successful': (r) => r.status === 200,
    'login response time < 300ms': (r) => r.timings.duration < 300,
    'login returns token': (r) => r.json('token') !== undefined,
  }) || errorRate.add(1);

  return res.status === 200 ? JSON.parse(res.body).token : null;
}

// Función para refresh token
function refreshToken(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/auth/refresh`, null, params);
  
  check(res, {
    'refresh successful': (r) => r.status === 200,
    'refresh response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
}

// Función para logout
function logoutUser(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/auth/logout`, null, params);
  
  check(res, {
    'logout successful': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Función para forgot password
function forgotPassword() {
  const randomEmail = `loadtest${Math.random().toString(36).substring(7)}@test.com`;
  const payload = JSON.stringify({
    email: randomEmail,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(`${BASE_URL}/auth/forgot-password`, payload, params);
  
  check(res, {
    'forgot password request sent': (r) => r.status === 200,
  }) || errorRate.add(1);
}

export default function () {
  // Scenario 1: Registro de nuevos usuarios
  const userData = registerUser();
  
  if (userData) {
    // Scenario 2: Login
    const token = loginUser(userData.email, userData.password);
    
    if (token) {
      // Scenario 3: Refresh token
      refreshToken(token);
      sleep(1);
      
      // Scenario 4: Logout
      logoutUser(token);
      sleep(1);
      
      // Scenario 5: Login nuevamente
      const newToken = loginUser(userData.email, userData.password);
      
      if (newToken) {
        logoutUser(newToken);
      }
    }
  }
  
  // Scenario 6: Forgot password (simulado)
  forgotPassword();
  
  sleep(1);
}
