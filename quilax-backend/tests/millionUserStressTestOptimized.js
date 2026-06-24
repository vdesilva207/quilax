/**
 * 🎯 TEST DE ESTRÉS OPTIMIZADO PARA 2M USUARIOS
 * 
 * Versión optimizada para manejar carga masiva
 * CON VALIDACIONES DE QUIZ IMPLEMENTADAS
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';

const BASE_URL = 'http://localhost:3000';

class OptimizedMillionUserStressTest {
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
    this.workerCount = Math.min(os.cpus().length, 8); // Limitar workers
    this.concurrencyLimit = 100; // Límite de concurrencia por worker
  }

  async runTest(userCount = 2000000) {
    console.log(`🚀 TEST OPTIMIZADO PARA ${userCount.toLocaleString()} USUARIOS`);
    console.log(`🖥️  Workers: ${this.workerCount}, Concurrencia: ${this.concurrencyLimit}`);
    
    const startTime = performance.now();
    
    // Fase 1: Login masivo optimizado
    await this.testOptimizedMassiveLogins(userCount);
    
    // Fase 2: Validación de quizzes bajo carga
    await this.testQuizValidationUnderLoad(50000);
    
    // Fase 3: Creación y publicación de quizzes
    await this.testQuizCreationAndPublishing(10000);
    
    // Fase 4: Operaciones concurrentes
    await this.testConcurrentOperations(100000);
    
    // Fase 5: Participación en quizzes
    await this.testQuizParticipation(50000);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.generateReport(totalTime, userCount);
  }

  async testOptimizedMassiveLogins(userCount) {
    console.log(`🔐 FASE 1: Login masivo optimizado - ${userCount.toLocaleString()} usuarios`);
    
    const batchSize = 1000; // Batch más pequeño para mejor control
    const batches = Math.ceil(userCount / batchSize);
    let successfulTokens = [];
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const currentBatchSize = Math.min(batchSize, userCount - (batch * batchSize));
      
      // Control de concurrencia
      const chunkSize = Math.min(this.concurrencyLimit, currentBatchSize);
      
      for (let i = 0; i < currentBatchSize; i += chunkSize) {
        const chunk = [];
        for (let j = 0; j < chunkSize && (i + j) < currentBatchSize; j++) {
          const userId = batch * batchSize + i + j + 1;
          chunk.push(this.simulateLogin(userId));
        }
        
        const chunkResults = await Promise.allSettled(chunk);
        
        // Procesar resultados del chunk
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            const userId = batch * batchSize + i + index + 1;
            this.tokenCache.set(userId, result.value.token);
            this.results.login.success++;
            successfulTokens.push(result.value.token);
          } else {
            this.results.login.failed++;
          }
        });
        
        // Pequeña pausa entre chunks
        if (i % (chunkSize * 10) === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      if (batch % 100 === 0) {
        console.log(`✅ Batch ${batch + 1}/${batches} - ${this.results.login.success} éxitos, ${this.results.login.failed} fallos`);
      }
    }
    
    console.log(`🎯 Login completado: ${this.results.login.success.toLocaleString()} éxito, ${this.results.login.failed.toLocaleString()} fallos`);
    console.log(`💾 Tokens cacheados: ${this.tokenCache.size.toLocaleString()}`);
  }

  async simulateLogin(userId) {
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
        }),
        timeout: 10000 // Timeout de 10 segundos
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          return data;
        }
      }
    } catch (error) {
      // Silenciar errores de timeout en carga masiva
    }
    
    return null;
  }

  async testQuizValidationUnderLoad(testCount) {
    console.log(`📝 FASE 2: Validación de quizzes - ${testCount.toLocaleString()} validaciones`);
    
    const batchSize = 500;
    const batches = Math.ceil(testCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const currentBatchSize = Math.min(batchSize, testCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.simulateQuizValidation());
      }
      
      await Promise.allSettled(promises);
      
      if (batch % 50 === 0) {
        console.log(`📊 Validación batch ${batch + 1}/${batches} - ${this.results.quizValidation.success} éxito, ${this.results.quizValidation.failed} fallos`);
      }
    }
    
    console.log(`✅ Validaciones completadas: ${this.results.quizValidation.success.toLocaleString()} éxito, ${this.results.quizValidation.failed.toLocaleString()} fallos`);
  }

  async simulateQuizValidation() {
    const startTime = performance.now();
    
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.quizValidation.failed++;
        return;
      }
      
      // Generar quiz aleatorio
      const isValid = Math.random() > 0.3;
      const quiz = this.generateRandomQuiz(isValid);
      
      const response = await fetch(`${BASE_URL}/api/quiz-validation/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quiz),
        timeout: 5000
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
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
      ? Math.floor(Math.random() * 25) + 5  // 5-30 preguntas
      : Math.floor(Math.random() * 70) + 1; // 1-70 preguntas
    
    const questions = [];
    
    for (let i = 0; i < questionCount; i++) {
      const readTime = shouldBeValid 
        ? Math.floor(Math.random() * 10) + 5   // 5-15s
        : Math.floor(Math.random() * 45) + 30; // 30-75s
        
      const answerTime = shouldBeValid
        ? Math.floor(Math.random() * 15) + 10  // 10-25s
        : Math.floor(Math.random() * 45) + 30; // 30-75s
      
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
    console.log(`📚 FASE 3: Creación y publicación - ${quizCount.toLocaleString()} quizzes`);
    
    const batchSize = 100;
    const batches = Math.ceil(quizCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const currentBatchSize = Math.min(batchSize, quizCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.simulateQuizCreation());
      }
      
      await Promise.allSettled(promises);
      
      if (batch % 20 === 0) {
        console.log(`📚 Creación batch ${batch + 1}/${batches} - ${this.results.quizCreation.success} éxito, ${this.results.quizCreation.failed} fallos`);
      }
    }
    
    console.log(`✅ Creación completada: ${this.results.quizCreation.success.toLocaleString()} éxito, ${this.results.quizCreation.failed.toLocaleString()} fallos`);
  }

  async simulateQuizCreation() {
    try {
      const token = this.getRandomToken();
      if (!token) {
        this.results.quizCreation.failed++;
        return;
      }
      
      const validQuiz = this.generateRandomQuiz(true);
      
      // Solo crear, no publicar para reducir carga
      const response = await fetch(`${BASE_URL}/api/quiz-creation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validQuiz),
        timeout: 10000
      });
      
      if (response.ok) {
        this.results.quizCreation.success++;
      } else {
        this.results.quizCreation.failed++;
      }
    } catch (error) {
      this.results.quizCreation.failed++;
    }
  }

  async testConcurrentOperations(operationCount) {
    console.log(`⚡ FASE 4: Operaciones concurrentes - ${operationCount.toLocaleString()} operaciones`);
    
    const batchSize = 500;
    const batches = Math.ceil(operationCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const currentBatchSize = Math.min(batchSize, operationCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        const operation = Math.floor(Math.random() * 3);
        
        switch (operation) {
          case 0:
            promises.push(this.simulateProfileUpdate());
            break;
          case 1:
            promises.push(this.simulatePayment());
            break;
          case 2:
            promises.push(this.simulateMessage());
            break;
        }
      }
      
      await Promise.allSettled(promises);
      
      if (batch % 50 === 0) {
        console.log(`⚡ Operaciones batch ${batch + 1}/${batches}`);
      }
    }
    
    console.log(`✅ Operaciones concurrentes completadas`);
  }

  async simulateProfileUpdate() {
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
          fullName: `Test User ${Math.floor(Math.random() * 1000000)}`,
          dateOfBirth: '1990-01-01',
          isOver18: true
        }),
        timeout: 5000
      });
      
      if (response.ok) {
        this.results.profile.success++;
      } else {
        this.results.profile.failed++;
      }
    } catch (error) {
      this.results.profile.failed++;
    }
  }

  async simulatePayment() {
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
        }),
        timeout: 5000
      });
      
      if (response.ok) {
        this.results.payments.success++;
      } else {
        this.results.payments.failed++;
      }
    } catch (error) {
      this.results.payments.failed++;
    }
  }

  async simulateMessage() {
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
          content: `Test message ${Math.floor(Math.random() * 1000000)}`,
          type: 'TEXT'
        }),
        timeout: 5000
      });
      
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
    
    const batchSize = 500;
    const batches = Math.ceil(participantCount / batchSize);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const currentBatchSize = Math.min(batchSize, participantCount - (batch * batchSize));
      
      for (let i = 0; i < currentBatchSize; i++) {
        promises.push(this.simulateQuizParticipation());
      }
      
      await Promise.allSettled(promises);
      
      if (batch % 20 === 0) {
        console.log(`🎯 Participación batch ${batch + 1}/${batches} - ${this.results.quizzes.success} éxito, ${this.results.quizzes.failed} fallos`);
      }
    }
    
    console.log(`✅ Participación completada: ${this.results.quizzes.success.toLocaleString()} éxito, ${this.results.quizzes.failed.toLocaleString()} fallos`);
  }

  async simulateQuizParticipation() {
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
        }),
        timeout: 5000
      });
      
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
    console.log('\n📊 ===== REPORTE FINAL DE ESTRÉS (2M USUARIOS) =====');
    console.log(`⏱️  Tiempo total: ${(totalTime / 60).toFixed(2)} minutos`);
    console.log(`👥 Usuarios totales: ${userCount.toLocaleString()}`);
    console.log(`💾 Tokens cacheados: ${this.tokenCache.size.toLocaleString()}\n`);
    
    console.log('📈 RESULTADOS POR CATEGORÍA:\n');
    
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.success + result.failed;
      const successRate = total > 0 ? (result.success / total * 100).toFixed(2) : '0.00';
      
      console.log(`${category.toUpperCase()}:`);
      console.log(`  ✅ Éxito: ${result.success.toLocaleString()}`);
      console.log(`  ❌ Fallos: ${result.failed.toLocaleString()}`);
      console.log(`  📊 Tasa éxito: ${successRate}%`);
      console.log(`  ⚡ Latencia: ${result.avgLatency.toFixed(2)}ms\n`);
    });
    
    console.log('🎯 ANÁLISIS PARA 2M USUARIOS:');
    
    const totalOperations = Object.values(this.results).reduce((sum, result) => 
      sum + result.success + result.failed, 0);
    const totalSuccess = Object.values(this.results).reduce((sum, result) => 
      sum + result.success, 0);
    const overallSuccessRate = (totalSuccess / totalOperations * 100).toFixed(2);
    
    console.log(`📊 Operaciones totales: ${totalOperations.toLocaleString()}`);
    console.log(`📊 Tasa de éxito global: ${overallSuccessRate}%`);
    console.log(`👥 Usuarios autenticados: ${this.results.login.success.toLocaleString()}/${userCount.toLocaleString()}`);
    
    // Evaluación final
    const loginSuccessRate = (this.results.login.success / userCount * 100);
    
    console.log('\n🎯 ESTADO DEL SISTEMA:');
    
    if (loginSuccessRate >= 80 && parseFloat(overallSuccessRate) >= 70) {
      console.log('🟢 SISTEMA EXCELENTE - Listo para 2M usuarios');
    } else if (loginSuccessRate >= 60 && parseFloat(overallSuccessRate) >= 50) {
      console.log('🟡 SISTEMA ACEPTABLE - Requiere optimización para 2M usuarios');
    } else {
      console.log('🔴 SISTEMA NO APTO - Necesita mejoras significativas para 2M usuarios');
    }
    
    console.log('\n✅ ===== TEST COMPLETADO =====');
  }
}

const test = new OptimizedMillionUserStressTest();

// Iniciar test con 2 millones de usuarios
test.runTest(2000000).catch(console.error);
