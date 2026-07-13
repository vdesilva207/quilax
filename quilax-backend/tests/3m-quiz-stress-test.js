/**
 * 🚀 TEST DE ESTRÉS ULTRA PARA 3M USUARIOS DE QUIZ 24/7
 * 
 * Test específico para:
 * - 2-3M usuarios constantes respondiendo quizzes
 * - 100K respuestas/segundo sostenidas
 * - Batch processing masivo
 * - Rate limiting optimizado
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000';

// Configuración ULTRA-optimizada para 3M usuarios 24/7
const ULTRA_CONFIG = {
  // Escenario real: 2-3M usuarios constantes
  concurrentUsers: 2500000,      // 2.5M usuarios concurrentes
  answersPerSecond: 100000,        // 100K respuestas/segundo sostenidas
  testDuration: 300,               // 5 minutos de test sostenido
  
  // Configuración de concurrencia
  concurrency: {
    batch: 1000,                   // 1K batches simultáneos
    answers: 10000,               // 10K respuestas por batch
    users: 50000                   // 50K usuarios activos
  },
  
  // Configuración de timeouts
  timeouts: {
    answer: 2000,                 // 2 segundos por respuesta
    batch: 5000,                  // 5 segundos por batch
    health: 1000                   // 1 segundo health check
  },
  
  // Configuración de rate limiting
  rateLimits: {
    answersPerWindow: 100000000,   // 100M respuestas/15min
    windowMs: 15 * 60 * 1000     // 15 minutos
  }
};

// Estado del test
let testState = {
  startTime: null,
  totalAnswers: 0,
  successfulAnswers: 0,
  failedAnswers: 0,
  batchesProcessed: 0,
  currentRPS: 0,
  peakRPS: 0,
  avgLatency: 0,
  errors: new Map()
};

// Generador de usuarios para 3M
class UltraUserGenerator {
  constructor() {
    this.userPool = [];
    this.currentIndex = 0;
    this.generateUserPool();
  }

  generateUserPool() {
    console.log('👥 Generando pool de 2.5M usuarios...');
    
    for (let i = 0; i < ULTRA_CONFIG.concurrentUsers; i++) {
      this.userPool.push({
        id: `ultra_user_${i}`,
        email: `ultra${i}@3mquiz.test`,
        password: 'UltraQuiz2024!',
        token: null,
        lastActivity: Date.now()
      });
    }
    
    console.log(`✅ Pool generado: ${this.userPool.length.toLocaleString()} usuarios`);
  }

  getNextUser() {
    const user = this.userPool[this.currentIndex % this.userPool.length];
    this.currentIndex++;
    return user;
  }

  getRandomUser() {
    return this.userPool[Math.floor(Math.random() * this.userPool.length)];
  }
}

// Generador de respuestas de quiz
class UltraAnswerGenerator {
  constructor() {
    this.questionTypes = ['multiple-choice', 'true-false', 'numeric', 'text'];
    this.difficulties = ['easy', 'medium', 'hard'];
  }

  generateAnswer(userId, quizId) {
    const questionId = Math.floor(Math.random() * 1000) + 1;
    const questionType = this.questionTypes[Math.floor(Math.random() * this.questionTypes.length)];
    
    let selectedOption;
    let isCorrect = Math.random() > 0.3; // 70% correct answers
    
    switch (questionType) {
      case 'multiple-choice':
        selectedOption = Math.floor(Math.random() * 4) + 1;
        break;
      case 'true-false':
        selectedOption = Math.random() > 0.5 ? 'true' : 'false';
        break;
      case 'numeric':
        selectedOption = Math.floor(Math.random() * 100) + 1;
        break;
      case 'text':
        selectedOption = `Answer_${Math.random().toString(36).substring(7)}`;
        break;
    }

    return {
      userId,
      quizId,
      questionId,
      selectedOption,
      isCorrect,
      responseTime: Math.floor(Math.random() * 5000) + 500, // 500ms - 5.5s
      timestamp: new Date().toISOString(),
      difficulty: this.difficulties[Math.floor(Math.random() * this.difficulties.length)],
      questionType
    };
  }

  generateBatch(userId, quizId, size = ULTRA_CONFIG.concurrency.answers) {
    const batch = [];
    for (let i = 0; i < size; i++) {
      batch.push(this.generateAnswer(userId, quizId));
    }
    return batch;
  }
}

// Cliente HTTP optimizado para alto volumen
class UltraHttpClient {
  constructor() {
    this.axios = axios.create({
      baseURL: BASE_URL,
      timeout: ULTRA_CONFIG.timeouts.answer,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'UltraQuiz-3M-Test/1.0'
      }
    });
    
    // Configurar interceptor para retry
    this.axios.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        if (!config || !config.retry) return Promise.reject(error);
        
        config.__retryCount = config.__retryCount || 0;
        if (config.__retryCount >= 3) return Promise.reject(error);
        
        config.__retryCount += 1;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return this.axios(config);
      }
    );
  }

  async submitAnswerBatch(answers) {
    const startTime = performance.now();
    
    try {
      const response = await this.axios.post('/api/quiz/batch-answer', {
        answers,
        quizId: answers[0]?.quizId || 'ultra_quiz_1',
        userId: answers[0]?.userId || 'ultra_user_1'
      }, {
        timeout: ULTRA_CONFIG.timeouts.batch
      });
      
      const latency = performance.now() - startTime;
      
      return {
        success: true,
        processed: response.data.processed || answers.length,
        failed: response.data.failed || 0,
        batchId: response.data.batchId,
        latency,
        status: response.status
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        latency,
        processed: 0,
        failed: answers.length
      };
    }
  }

  async submitSingleAnswer(answer) {
    const startTime = performance.now();
    
    try {
      const response = await this.axios.post('/api/quiz/answer', answer, {
        timeout: ULTRA_CONFIG.timeouts.answer
      });
      
      const latency = performance.now() - startTime;
      
      return {
        success: true,
        latency,
        status: response.status
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        latency
      };
    }
  }
}

// Motor de test ultra-optimizado
class UltraTestEngine {
  constructor() {
    this.userGenerator = new UltraUserGenerator();
    this.answerGenerator = new UltraAnswerGenerator();
    this.httpClient = new UltraHttpClient();
    this.isRunning = false;
    this.intervals = new Map();
  }

  async startTest() {
    console.log('🚀 Iniciando test ULTRA para 3M usuarios 24/7...');
    
    // Verificar servidor
    const healthCheck = await this.checkServerHealth();
    if (!healthCheck) {
      console.error('❌ Servidor no disponible');
      return;
    }
    
    testState.startTime = Date.now();
    this.isRunning = true;
    
    console.log('📊 Configuración del test:');
    console.log(`  - Usuarios concurrentes: ${ULTRA_CONFIG.concurrentUsers.toLocaleString()}`);
    console.log(`  - Respuestas/segundo objetivo: ${ULTRA_CONFIG.answersPerSecond.toLocaleString()}`);
    console.log(`  - Duración: ${ULTRA_CONFIG.testDuration} segundos`);
    console.log(`  - Batch size: ${ULTRA_CONFIG.concurrency.answers}`);
    
    // Iniciar monitoreo
    this.startMonitoring();
    
    // Iniciar carga sostenida
    await this.startSustainedLoad();
    
    // Esperar duración del test
    await this.waitForTestCompletion();
    
    // Generar reporte final
    this.generateFinalReport();
  }

  async checkServerHealth() {
    try {
      const response = await axios.get(`${BASE_URL}/health`, {
        timeout: ULTRA_CONFIG.timeouts.health
      });
      
      console.log('✅ Servidor saludable:', response.data.status);
      console.log(`📈 Versión: ${response.data.version}`);
      console.log(`🎯 Capacidad: ${response.data.capacity?.maxConcurrentUsers || 'Unknown'} usuarios`);
      
      return true;
    } catch (error) {
      console.error('❌ Error health check:', error.message);
      return false;
    }
  }

  startMonitoring() {
    // Monitoreo cada segundo
    const monitoringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }
      
      this.printProgress();
    }, 1000);
    
    this.intervals.set('monitoring', monitoringInterval);
  }

  async startSustainedLoad() {
    console.log('⚡ Iniciando carga sostenida de 100K respuestas/segundo...');
    
    const targetRPS = ULTRA_CONFIG.answersPerSecond;
    const batchSize = ULTRA_CONFIG.concurrency.answers;
    const batchesPerSecond = Math.ceil(targetRPS / batchSize);
    
    console.log(`📊 Configuración de carga:`);
    console.log(`  - Target RPS: ${targetRPS.toLocaleString()}`);
    console.log(`  - Batch size: ${batchSize}`);
    console.log(`  - Batches/segundo: ${batchesPerSecond}`);
    
    // Iniciar múltiples streams de carga
    for (let i = 0; i < batchesPerSecond; i++) {
      setTimeout(() => {
        this.startLoadStream(i, batchSize);
      }, (1000 / batchesPerSecond) * i);
    }
  }

  async startLoadStream(streamId, batchSize) {
    while (this.isRunning) {
      const startTime = performance.now();
      
      // Generar batch de respuestas
      const user = this.userGenerator.getRandomUser();
      const answers = this.answerGenerator.generateBatch(
        user.id, 
        `ultra_quiz_${streamId}`, 
        batchSize
      );
      
      // Enviar batch
      const result = await this.httpClient.submitAnswerBatch(answers);
      
      // Actualizar estadísticas
      this.updateStats(result, answers.length, performance.now() - startTime);
      
      // Pequeña pausa para mantener ritmo
      const elapsed = performance.now() - startTime;
      if (elapsed < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsed));
      }
    }
  }

  updateStats(result, answerCount, requestLatency) {
    testState.totalAnswers += answerCount;
    testState.batchesProcessed++;
    
    if (result.success) {
      testState.successfulAnswers += result.processed;
      testState.failedAnswers += result.failed;
    } else {
      testState.failedAnswers += answerCount;
      
      // Track errors
      const errorKey = `${result.status}:${result.error}`;
      testState.errors.set(errorKey, (testState.errors.get(errorKey) || 0) + 1);
    }
    
    // Calcular RPS actual
    const elapsed = (Date.now() - testState.startTime) / 1000;
    testState.currentRPS = Math.round(testState.totalAnswers / elapsed);
    testState.peakRPS = Math.max(testState.peakRPS, testState.currentRPS);
    
    // Actualizar latencia promedio
    testState.avgLatency = (testState.avgLatency + result.latency) / 2;
  }

  printProgress() {
    const elapsed = Math.floor((Date.now() - testState.startTime) / 1000);
    const remaining = ULTRA_CONFIG.testDuration - elapsed;
    
    const successRate = testState.totalAnswers > 0 
      ? ((testState.successfulAnswers / testState.totalAnswers) * 100).toFixed(2)
      : '0.00';
    
    // Limpiar línea y mostrar progreso
    process.stdout.write('\r' + ' '.repeat(100) + '\r');
    
    console.log(`⚡ ${elapsed}s/${ULTRA_CONFIG.testDuration}s | RPS: ${testState.currentRPS.toLocaleString()} | Éxito: ${successRate}% | Latencia: ${testState.avgLatency.toFixed(0)}ms | Peak: ${testState.peakRPS.toLocaleString()} RPS`);
  }

  async waitForTestCompletion() {
    console.log(`\n⏱️ Test corriendo por ${ULTRA_CONFIG.testDuration} segundos...`);
    
    await new Promise(resolve => {
      setTimeout(() => {
        this.isRunning = false;
        resolve();
      }, ULTRA_CONFIG.testDuration * 1000);
    });
  }

  generateFinalReport() {
    console.log('\n🎯 ===== REPORTE FINAL TEST ULTRA 3M =====');
    
    const totalTime = (Date.now() - testState.startTime) / 1000;
    const avgRPS = Math.round(testState.totalAnswers / totalTime);
    const successRate = ((testState.successfulAnswers / testState.totalAnswers) * 100).toFixed(2);
    
    console.log(`⏱️ Duración total: ${totalTime} segundos`);
    console.log(`📊 Respuestas totales: ${testState.totalAnswers.toLocaleString()}`);
    console.log(`✅ Respuestas exitosas: ${testState.successfulAnswers.toLocaleString()}`);
    console.log(`❌ Respuestas fallidas: ${testState.failedAnswers.toLocaleString()}`);
    console.log(`📈 Tasa éxito: ${successRate}%`);
    console.log(`⚡ RPS promedio: ${avgRPS.toLocaleString()}`);
    console.log(`🚀 RPS pico: ${testState.peakRPS.toLocaleString()}`);
    console.log(`📦 Batches procesados: ${testState.batchesProcessed.toLocaleString()}`);
    console.log(`⏱️ Latencia promedio: ${testState.avgLatency.toFixed(2)}ms`);
    
    // Análisis de rendimiento
    console.log('\n🎯 ANÁLISIS DE RENDIMIENTO:');
    const targetRPS = ULTRA_CONFIG.answersPerSecond;
    const rpsAchievement = (avgRPS / targetRPS) * 100;
    
    if (rpsAchievement >= 90) {
      console.log(`🟢 EXCELENTE: ${rpsAchievement.toFixed(1)}% del RPS objetivo alcanzado`);
    } else if (rpsAchievement >= 70) {
      console.log(`🟡 BUENO: ${rpsAchievement.toFixed(1)}% del RPS objetivo alcanzado`);
    } else {
      console.log(`🔴 NECESITA MEJORA: Solo ${rpsAchievement.toFixed(1)}% del RPS objetivo`);
    }
    
    if (parseFloat(successRate) >= 95) {
      console.log(`🟢 EXCELENTE: Tasa de éxito del ${successRate}%`);
    } else if (parseFloat(successRate) >= 85) {
      console.log(`🟡 BUENO: Tasa de éxito del ${successRate}%`);
    } else {
      console.log(`🔴 NECESITA MEJORA: Tasa de éxito solo del ${successRate}%`);
    }
    
    // Top errores
    if (testState.errors.size > 0) {
      console.log('\n❌ ERRORES PRINCIPALES:');
      const sortedErrors = Array.from(testState.errors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      sortedErrors.forEach(([error, count]) => {
        console.log(`  ${error}: ${count} veces`);
      });
    }
    
    // Recomendaciones
    console.log('\n🔧 RECOMENDACIONES:');
    if (rpsAchievement < 90) {
      console.log('  - Aumentar rate limiting para respuestas');
      console.log('  - Optimizar batch processing');
      console.log('  - Considerar más workers de procesamiento');
    }
    
    if (parseFloat(successRate) < 95) {
      console.log('  - Revisar timeouts de conexión');
      console.log('  - Implementar mejor retry logic');
      console.log('  - Optimizar pool de conexiones');
    }
    
    if (testState.avgLatency > 1000) {
      console.log('  - Optimizar latencia de respuestas');
      console.log('  - Considerar CDN para respuestas');
      console.log('  - Revisar configuración de WebSocket');
    }
    
    console.log('\n✅ ===== TEST ULTRA COMPLETADO =====');
  }
}

// Función principal
async function main() {
  console.log('🚀 ===== TEST DE ESTRÉS ULTRA 3M USUARIOS 24/7 =====');
  console.log('🎯 Objetivo: 100K respuestas/segundo sostenidas');
  console.log('📊 Escenario: 2.5M usuarios concurrentes');
  console.log('⏱️ Duración: 5 minutos de carga sostenida');
  console.log('');
  
  const testEngine = new UltraTestEngine();
  
  try {
    await testEngine.startTest();
  } catch (error) {
    console.error('❌ Error crítico en test:', error);
    process.exit(1);
  }
}

// Ejecutar test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { UltraTestEngine, UltraUserGenerator, UltraAnswerGenerator, UltraHttpClient };
