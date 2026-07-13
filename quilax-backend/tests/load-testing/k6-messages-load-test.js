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
    http_req_duration: ['p(95)<400', 'p(99)<600'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = 'http://localhost:3001';

// Función para crear usuario y obtener token
function createAndLoginUser() {
  const randomEmail = `msgtest${Math.random().toString(36).substring(7)}@test.com`;
  
  // Registrar usuario
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
    'messages response time < 400ms': (r) => r.timings.duration < 400,
  }) || errorRate.add(1);
}

// Función para enviar mensaje
function sendMessage(token, toUserId) {
  const payload = JSON.stringify({
    toUserId: toUserId,
    content: `Mensaje de prueba ${Math.random().toString(36).substring(7)}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/messages`, payload, params);
  
  check(res, {
    'message sent': (r) => r.status === 201 || r.status === 200,
    'message sent response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);
}

// Función para marcar mensaje como leído
function markAsRead(token, messageId) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.put(`${BASE_URL}/messages/${messageId}/read`, null, params);
  
  check(res, {
    'message marked as read': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Función para obtener conversaciones
function getConversations(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/conversations`, params);
  
  check(res, {
    'conversations retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Función para crear ticket de soporte
function createSupportTicket(token) {
  const payload = JSON.stringify({
    category: 'TECHNICAL',
    subject: `Ticket de prueba ${Math.random().toString(36).substring(7)}`,
    description: 'Descripción de prueba para load testing',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/support/tickets`, payload, params);
  
  check(res, {
    'ticket created': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);

  return res.status === 201 || res.status === 200 ? JSON.parse(res.body).id : null;
}

// Función para obtener tickets de soporte
function getSupportTickets(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/support/tickets/my-tickets`, params);
  
  check(res, {
    'tickets retrieved': (r) => r.status === 200,
  }) || errorRate.add(1);
}

// Función para enviar mensaje a ticket
function sendTicketMessage(token, ticketId) {
  const payload = JSON.stringify({
    content: `Mensaje de ticket ${Math.random().toString(36).substring(7)}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.post(`${BASE_URL}/support/tickets/${ticketId}/messages`, payload, params);
  
  check(res, {
    'ticket message sent': (r) => r.status === 201 || r.status === 200,
  }) || errorRate.add(1);
}

export default function () {
  const token = createAndLoginUser();
  
  if (!token) {
    return;
  }

  // Scenario 1: Obtener mensajes
  getMessages(token);
  sleep(1);
  
  // Scenario 2: Enviar mensaje a otro usuario (simulado con ID 1)
  sendMessage(token, 1);
  sleep(1);
  
  // Scenario 3: Obtener conversaciones
  getConversations(token);
  sleep(1);
  
  // Scenario 4: Crear ticket de soporte
  const ticketId = createSupportTicket(token);
  sleep(1);
  
  // Scenario 5: Obtener tickets de soporte
  getSupportTickets(token);
  sleep(1);
  
  // Scenario 6: Enviar mensaje a ticket
  if (ticketId) {
    sendTicketMessage(token, ticketId);
  }
  
  // Scenario 7: Obtener mensajes nuevamente
  getMessages(token);
  sleep(1);
  
  // Scenario 8: Obtener conversaciones nuevamente
  getConversations(token);
  
  sleep(2);
}
