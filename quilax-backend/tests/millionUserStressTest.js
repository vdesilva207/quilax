/**
 * 🎯 TEST DE ESTRÉS PARA 2 MILLONES DE USUARIOS
 * 
 * CON VALIDACIONES DE QUIZ IMPLEMENTADAS:
 * - Máximo 20 minutos por quiz
 * - 5-50 preguntas por quiz
 * - Prioridad: tiempo > cantidad
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import os from 'os';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

class MillionUserStressTest {
  constructor() {
    this.results = {
      login: { success: 0, failed: 0, avgLatency: 0 },
      quizValidation: { success: 0, failed: 0, avgLatency: 0 },
      quizCreation: { success: 0, failed: 0, avgLatency: 0 },
      quizPublishing: { success: 0, failed: 0, avgLatency: 0 },
      profile: { success: 0, failed: 0, avgLatency: 0 },
      payments: { success: 0, failed: 0, avgLatency: 0 },
      messages: { success: 0, failed: 0, avgLatency: 0 },
      quizzes: { success: 0, failed: 0, avgLatency: 0 }
    };
    
    this.tokenCache = new Map();
    this.maxWebSocketConnections = 0;
    this.workerCount = os.cpus().length;
  }

  async runTest(userCount = 2000000) {
    console.log(`🚀 INICIANDO TEST DE ESTRÉS PARA ${userCount.toLocaleString()} USUARIOS`);
    console.log(`🖥️  Usando ${this.workerCount} workers para procesamiento paralelo`);
    
    const startTime = performance.now();
    
    // Fase 1: Login masivo
    await this.testMassiveLogins(userCount);
    
    // Fase 2: Validación de quizzes bajo carga
    await this.testQuizValidationUnderLoad(100000);
    
    // Fase 3: Creación y publicación de quizzes
    await this.testQuizCreationAndPublishing(50000);
    
    // Fase 4: Operaciones concurrentes
    await this.testConcurrentOperations(500000);
    
    // Fase 5: Participación en quizzes
    await this.testQuizParticipation(200000);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.generateReport(totalTime, userCount);
  }

  async testMassiveLogins(userCount) {
    console.log(`🔐 FASE 1: Test de login masivo - ${userCount.toLocaleString()} usuarios`);
    
    const batchSize = 10000;
    const batches = Math.ceil(userCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const latencies = [];
      const currentBatchSize = Math.min(batchSize, userCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        const userId = batch * batchSize + i + 1;
        promises.push(this.simulateLogin(userId, latencies));
      }
      
      await Promise.allSettled(promises);
      
      const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
      
      console.log(`✅ Batch ${batch + 1}/${batches} completado - ${this.results.login.success} éxitos, ${this.results.login.failed} fallos`);
      
      // Pequeña pausa para evitar sobrecarga
      if (batch % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const totalLatency = this.results.login.avgLatency;
    console.log(`🎯 Login masivo completado: ${this.results.login.success.toLocaleString()} éxito, ${this.results.login.failed.toLocaleString()} fallos`);
  }

  async simulateLogin(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: `testuser${userId}@test.com`,
          password: 'testpassword123'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.tokenCache.set(userId, data.token);
          this.results.login.success++;
          return data;
        }
      }
      
      this.results.login.failed++;
    } catch (error) {
      this.results.login.failed++;
    }
    
    return null;
  }

  async testQuizValidationUnderLoad(testCount) {
    console.log(`📝 FASE 2: Validación de quizzes bajo carga - ${testCount.toLocaleString()} validaciones`);
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < testCount; i++) {
      promises.push(this.simulateQuizValidation(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.quizValidation.avgLatency = avgLatency;
    
    console.log(`✅ Validaciones completadas: ${this.results.quizValidation.success.toLocaleString()} éxito, ${this.results.quizValidation.failed.toLocaleString()} fallos`);
  }

  async simulateQuizValidation(testId, latencies) {
    const startTime = performance.now();
    
    try {
      // Generar quizzes válidos e inválidos aleatoriamente
      const isValid = Math.random() > 0.3; // 70% válidos
      const quiz = this.generateRandomQuiz(isValid);
      
      const response = await fetch(`${BASE_URL}/api/quiz-validation/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getRandomToken()}`
        },
        body: JSON.stringify(quiz)
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        const result = await response.json();
        if (result.isValid === isValid) {
          this.results.quizValidation.success++;
        } else {
          this.results.quizValidation.failed++;
        }
      } else {
        this.results.quizValidation.failed++;
      }
    } catch (error) {
      this.results.quizValidation.failed++;
    }
  }

  generateRandomQuiz(shouldBeValid) {
    const questionCount = shouldBeValid 
      ? Math.floor(Math.random() * 30) + 5  // 5-35 preguntas
      : Math.floor(Math.random() * 60) + 1; // 1-60 preguntas
    
    const questions = [];
    
    for (let i = 0; i < questionCount; i++) {
      const readTime = shouldBeValid 
        ? Math.floor(Math.random() * 15) + 5   // 5-20s
        : Math.floor(Math.random() * 60) + 30; // 30-90s
        
      const answerTime = shouldBeValid
        ? Math.floor(Math.random() * 20) + 10  // 10-30s
        : Math.floor(Math.random() * 60) + 30; // 30-90s
      
      questions.push({
        text: `Pregunta ${i + 1}`,
        readTime,
        answerTime,
        answers: [
          { text: 'Opción A', isCorrect: true },
          { text: 'Opción B', isCorrect: false },
          { text: 'Opción C', isCorrect: false },
          { text: 'Opción D', isCorrect: false }
        ]
      });
    }
    
    return {
      title: `Quiz Test ${Math.floor(Math.random() * 1000000)}`,
      questions
    };
  }

  async testQuizCreationAndPublishing(quizCount) {
    console.log(`📚 FASE 3: Creación y publicación de quizzes - ${quizCount.toLocaleString()} quizzes`);
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < quizCount; i++) {
      promises.push(this.simulateQuizCreation(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.quizCreation.avgLatency = avgLatency;
    
    console.log(`✅ Creación completada: ${this.results.quizCreation.success.toLocaleString()} éxito, ${this.results.quizCreation.failed.toLocaleString()} fallos`);
  }

  async simulateQuizCreation(quizId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.quizCreation.failed++;
        return;
      }
      
      const validQuiz = this.generateRandomQuiz(true);
      
      // Crear quiz
      const createResponse = await fetch(`${BASE_URL}/api/quiz-creation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validQuiz)
      });
      
      if (!createResponse.ok) {
        this.results.quizCreation.failed++;
        return;
      }
      
      const createdQuiz = await createResponse.json();
      
      // Intentar publicar
      const publishResponse = await fetch(`${BASE_URL}/api/quiz-creation/${createdQuiz.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Mañana
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (publishResponse.ok) {
        this.results.quizPublishing.success++;
      } else {
        this.results.quizPublishing.failed++;
      }
      
      this.results.quizCreation.success++;
    } catch (error) {
      this.results.quizCreation.failed++;
      this.results.quizPublishing.failed++;
    }
  }

  async testConcurrentOperations(operationCount) {
    console.log(`⚡ FASE 4: Operaciones concurrentes - ${operationCount.toLocaleString()} operaciones`);
    
    const promises = [];
    const profileLatencies = [];
    const paymentLatencies = [];
    const messageLatencies = [];
    
    for (let i = 0; i < operationCount; i++) {
      const operation = Math.floor(Math.random() * 3);
      
      switch (operation) {
        case 0:
          promises.push(this.simulateProfileUpdate(i, profileLatencies));
          break;
        case 1:
          promises.push(this.simulatePayment(i, paymentLatencies));
          break;
        case 2:
          promises.push(this.simulateMessage(i, messageLatencies));
          break;
      }
    }
    
    await Promise.allSettled(promises);
    
    this.results.profile.avgLatency = profileLatencies.length > 0 ? 
      profileLatencies.reduce((a, b) => a + b, 0) / profileLatencies.length : 0;
    this.results.payments.avgLatency = paymentLatencies.length > 0 ? 
      paymentLatencies.reduce((a, b) => a + b, 0) / paymentLatencies.length : 0;
    this.results.messages.avgLatency = messageLatencies.length > 0 ? 
      messageLatencies.reduce((a, b) => a + b, 0) / messageLatencies.length : 0;
    
    console.log(`✅ Operaciones concurrentes completadas`);
  }

  async simulateProfileUpdate(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.profile.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: `Test User ${userId}`,
          dateOfBirth: '1990-01-01',
          isOver18: true
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.profile.success++;
      } else {
        this.results.profile.failed++;
      }
    } catch (error) {
      this.results.profile.failed++;
    }
  }

  async simulatePayment(transactionId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.payments.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/payments/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 1000,
          method: 'credit_card'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.payments.success++;
      } else {
        this.results.payments.failed++;
      }
    } catch (error) {
      this.results.payments.failed++;
    }
  }

  async simulateMessage(messageId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.messages.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: Math.floor(Math.random() % 10000) + 1,
          content: `Test message ${messageId}`,
          type: 'TEXT'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.messages.success++;
      } else {
        this.results.messages.failed++;
      }
    } catch (error) {
      this.results.messages.failed++;
    }
  }

  async testQuizParticipation(participantCount) {
    console.log(`🎯 FASE 5: Participación en quizzes - ${participantCount.toLocaleString()} participantes`);
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < participantCount; i++) {
      promises.push(this.simulateQuizParticipation(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.quizzes.avgLatency = avgLatency;
    
    console.log(`✅ Participación completada: ${this.results.quizzes.success.toLocaleString()} éxito, ${this.results.quizzes.failed.toLocaleString()} fallos`);
  }

  async simulateQuizParticipation(participantId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.quizzes.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/quiz/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: Math.floor(Math.random() % 100) + 1
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.quizzes.success++;
      } else {
        this.results.quizzes.failed++;
      }
    } catch (error) {
      this.results.quizzes.failed++;
    }
  }

  getRandomToken() {
    const tokens = Array.from(this.tokenCache.values());
    if (tokens.length === 0) return null;
    return tokens[Math.floor(Math.random() * tokens.length)];
  }

  generateReport(totalTime, userCount) {
    console.log('\n📊 ===== REPORTE FINAL DE ESTRÉS =====');
    console.log(`⏱️  Tiempo total: ${(totalTime / 60).toFixed(2)} minutos`);
    console.log(`👥 Usuarios totales: ${userCount.toLocaleString()}`);
    console.log(`🔗 Conexiones WebSocket máximas: ${this.maxWebSocketConnections}\n`);
    
    console.log('📈 RESULTADOS POR CATEGORÍA:\n');
    
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.success + result.failed;
      const successRate = total > 0 ? (result.success / total * 100).toFixed(2) : '0.00';
      
      console.log(`${category.toUpperCase()}:`);
      console.log(`  ✅ Éxito: ${result.success.toLocaleString()}`);
      console.log(`  ❌ Fallos: ${result.failed.toLocaleString()}`);
      console.log(`  📊 Tasa éxito: ${successRate}%`);
      console.log(`  ⚡ Latencia promedio: ${result.avgLatency.toFixed(2)}ms\n`);
    });
    
    console.log('🎯 ANÁLISIS DE RENDIMIENTO:');
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.success + result.failed;
      const successRate = total > 0 ? (result.success / total * 100) : 0;
      
      if (successRate < 50) {
        console.log(`⚠️  ${category}: Tasa de éxito baja (${successRate.toFixed(2)}%)`);
      }
      
      if (result.avgLatency > 5000) {
        console.log(`⚠️  ${category}: Latencia alta (${result.avgLatency.toFixed(2)}ms)`);
      }
      
      if (successRate >= 50 && result.avgLatency <= 5000) {
        console.log(`✅ ${category}: Rendimiento bueno`);
      }
    });
    
    console.log('\n🎯 ESTADO DEL SISTEMA PARA 2M USUARIOS:');
    
    const totalOperations = Object.values(this.results).reduce((sum, result) => 
      sum + result.success + result.failed, 0);
    const totalSuccess = Object.values(this.results).reduce((sum, result) => 
      sum + result.success, 0);
    const overallSuccessRate = (totalSuccess / totalOperations * 100).toFixed(2);
    
    console.log(`📊 Operaciones totales: ${totalOperations.toLocaleString()}`);
    console.log(`📊 Tasa de éxito global: ${overallSuccessRate}%`);
    
    if (parseFloat(overallSuccessRate) >= 70) {
      console.log('🟢 SISTEMA LISTO PARA 2M USUARIOS');
    } else if (parseFloat(overallSuccessRate) >= 50) {
      console.log('🟡 SISTEMA NECESITA OPTIMIZACIÓN PARA 2M USUARIOS');
    } else {
      console.log('🔴 SISTEMA NO ESTÁ LISTO PARA 2M USUARIOS');
    }
    
    console.log('\n✅ ===== TEST COMPLETADO =====');
  }
}

const test = new MillionUserStressTest();

// Ejecutar con 2 millones de usuarios
test.runTest(2000000).catch(console.error);
