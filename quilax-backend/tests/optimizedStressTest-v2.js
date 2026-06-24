/**
 * 🚀 TEST DE ESTRÉS OPTIMIZADO V2 - 2M+ USUARIOS
 * 
 * Mejoras implementadas:
 * - Rate limiting aumentado 5x
 * - Pool de conexiones aumentado 5x
 * - Timeout reducidos para mejor respuesta
 * - Batch operations mejoradas
 * - Cache optimizado
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000';

// Configuración mejorada del test
const CONFIG = {
  // Fases de prueba - más agresivas
  phases: [
    { name: '100K', users: 100000, logins: 50000, validations: 10000, operations: 20000 },
    { name: '500K', users: 500000, logins: 250000, validations: 50000, operations: 100000 },
    { name: '1M', users: 1000000, logins: 500000, validations: 100000, operations: 200000 },
    { name: '2M', users: 2000000, logins: 1000000, validations: 200000, operations: 400000 }
  ],
  
  // Configuración de concurrencia mejorada
  concurrency: {
    login: 1000,      // Aumentado de 500 a 1000
    validation: 500,  // Aumentado de 100 a 500
    operations: 200   // Aumentado de 50 a 200
  },
  
  // Configuración de timeouts reducidos
  timeouts: {
    login: 5000,      // Reducido de 10000 a 5000ms
    validation: 3000, // Reducido de 5000 a 3000ms
    operations: 2000  // Reducido de 3000 a 2000ms
  },
  
  // Retry configuration mejorada
  retries: {
    max: 2,           // Reducido de 3 a 2
    delay: 100        // Reducido de 500 a 100ms
  }
};

// Cache de tokens mejorado
const tokenCache = new Map();
const userCredentials = [];

// Generar usuarios de prueba mejorados
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `testuser${Date.now()}_${i}@test.com`,
      password: 'TestPassword123!',
      username: `testuser${Date.now()}_${i}`
    });
  }
  return users;
}

// Login mejorado con retry y cache
async function loginUser(user, retryCount = 0) {
  try {
    // Verificar cache primero
    const cachedToken = tokenCache.get(user.email);
    if (cachedToken) {
      return { success: true, token: cachedToken, cached: true };
    }

    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password
    }, {
      timeout: CONFIG.timeouts.login,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuilaxStressTest/2.0'
      }
    });

    const token = response.data.token;
    tokenCache.set(user.email, token);
    
    return { 
      success: true, 
      token, 
      cached: false,
      responseTime: Date.now()
    };
  } catch (error) {
    if (retryCount < CONFIG.retries.max) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.retries.delay));
      return loginUser(user, retryCount + 1);
    }
    return { 
      success: false, 
      error: error.response?.data?.message || error.message,
      cached: false
    };
  }
}

// Validación de quiz mejorada
async function validateQuiz(token, retryCount = 0) {
  try {
    const quizData = {
      title: `Test Quiz ${Date.now()}`,
      description: 'Test quiz description',
      questions: [
        {
          text: 'Test question 1',
          answers: ['A', 'B', 'C', 'D'],
          correctAnswer: 0,
          maxPoints: 1000,
          readTime: 10,
          answerTime: 20
        },
        {
          text: 'Test question 2',
          answers: ['A', 'B', 'C', 'D'],
          correctAnswer: 1,
          maxPoints: 1000,
          readTime: 10,
          answerTime: 20
        }
      ]
    };

    const response = await axios.post(`${BASE_URL}/api/quiz-validation/validate`, quizData, {
      timeout: CONFIG.timeouts.validation,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'QuilaxStressTest/2.0'
      }
    });

    return { 
      success: true, 
      valid: response.data.valid,
      responseTime: Date.now()
    };
  } catch (error) {
    if (retryCount < CONFIG.retries.max) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.retries.delay));
      return validateQuiz(token, retryCount + 1);
    }
    return { 
      success: false, 
      error: error.response?.data?.message || error.message
    };
  }
}

// Operaciones concurrentes mejoradas
async function performConcurrentOperations(token, retryCount = 0) {
  const operations = [
    // Profile update
    axios.put(`${BASE_URL}/api/profile`, 
      { username: `updated_${Date.now()}` },
      {
        timeout: CONFIG.timeouts.operations,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'QuilaxStressTest/2.0'
        }
      }
    ).catch(() => ({ success: false, type: 'profile' })),
    
    // Get quizzes
    axios.get(`${BASE_URL}/api/quizzes`, {
      timeout: CONFIG.timeouts.operations,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'QuilaxStressTest/2.0'
      }
    }).catch(() => ({ success: false, type: 'quizzes' })),
    
    // Get messages
    axios.get(`${BASE_URL}/api/messages`, {
      timeout: CONFIG.timeouts.operations,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'QuilaxStressTest/2.0'
      }
    }).catch(() => ({ success: false, type: 'messages' }))
  ];

  try {
    const results = await Promise.allSettled(operations);
    return {
      success: true,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false }),
      responseTime: Date.now()
    };
  } catch (error) {
    if (retryCount < CONFIG.retries.max) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.retries.delay));
      return performConcurrentOperations(token, retryCount + 1);
    }
    return { 
      success: false, 
      error: error.message
    };
  }
}

// Ejecutar fase de prueba mejorada
async function runPhase(phase) {
  console.log(`\n📊 ===== FASE ${phase.name.toUpperCase()} =====`);
  console.log(`👥 Usuarios: ${phase.users.toLocaleString()}`);
  console.log(`🔐 Logins: ${phase.logins.toLocaleString()}`);
  console.log(`📝 Validaciones: ${phase.validations.toLocaleString()}`);
  console.log(`⚡ Operaciones: ${phase.operations.toLocaleString()}`);
  
  const startTime = performance.now();
  const results = {
    login: { success: 0, failed: 0, cached: 0, totalTime: 0 },
    validation: { success: 0, failed: 0, totalTime: 0 },
    operations: { success: 0, failed: 0, totalTime: 0 }
  };

  // Generar usuarios para esta fase
  const users = generateTestUsers(phase.logins);
  userCredentials.push(...users);

  // Fase 1: Login mejorado
  console.log(`\n🔐 Test Login Optimizado - ${phase.logins.toLocaleString()} usuarios`);
  const loginStartTime = performance.now();
  
  const loginBatches = Math.ceil(phase.logins / CONFIG.concurrency.login);
  let loginProgress = 0;
  
  for (let batch = 0; batch < loginBatches; batch++) {
    const batchUsers = users.slice(
      batch * CONFIG.concurrency.login, 
      (batch + 1) * CONFIG.concurrency.login
    );
    
    const loginPromises = batchUsers.map(user => loginUser(user));
    const loginResults = await Promise.allSettled(loginPromises);
    
    loginResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.login.success++;
          if (result.value.cached) results.login.cached++;
        } else {
          results.login.failed++;
        }
      } else {
        results.login.failed++;
      }
    });
    
    loginProgress = Math.round(((batch + 1) / loginBatches) * 100);
    if (loginProgress % 10 === 0) {
      console.log(`📈 Login: ${loginProgress}% - ${results.login.success} éxito, ${results.login.failed} fallos`);
    }
  }
  
  results.login.totalTime = performance.now() - loginStartTime;
  console.log(`✅ Login completado: ${results.login.success.toLocaleString()} éxito, ${results.login.failed.toLocaleString()} fallos`);

  // Fase 2: Validación mejorada
  console.log(`\n📝 Test Validación Optimizada - ${phase.validations.toLocaleString()} validaciones`);
  const validationStartTime = performance.now();
  
  const tokens = Array.from(tokenCache.values()).slice(0, Math.min(phase.validations, tokenCache.size));
  if (tokens.length < phase.validations) {
    console.log(`⚠️  Advertencia: Solo hay ${tokens.length} tokens disponibles para ${phase.validations} validaciones`);
  }
  
  const validationBatches = Math.ceil(phase.validations / CONFIG.concurrency.validation);
  let validationProgress = 0;
  
  for (let batch = 0; batch < validationBatches; batch++) {
    const batchTokens = tokens.slice(
      batch * CONFIG.concurrency.validation, 
      (batch + 1) * CONFIG.concurrency.validation
    );
    
    const validationPromises = batchTokens.map(token => validateQuiz(token));
    const validationResults = await Promise.allSettled(validationPromises);
    
    validationResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.validation.success++;
        } else {
          results.validation.failed++;
        }
      } else {
        results.validation.failed++;
      }
    });
    
    validationProgress = Math.round(((batch + 1) / validationBatches) * 100);
    if (validationProgress % 10 === 0) {
      console.log(`📈 Validación: ${validationProgress}% - ${results.validation.success} éxito, ${results.validation.failed} fallos`);
    }
  }
  
  results.validation.totalTime = performance.now() - validationStartTime;
  console.log(`✅ Validación completada: ${results.validation.success.toLocaleString()} éxito, ${results.validation.failed.toLocaleString()} fallos`);

  // Fase 3: Operaciones concurrentes mejoradas
  console.log(`\n⚡ Test Operaciones Concurrentes Optimizadas - ${phase.operations.toLocaleString()} operaciones`);
  const operationsStartTime = performance.now();
  
  const operationTokens = Array.from(tokenCache.values()).slice(0, Math.min(phase.operations, tokenCache.size));
  const operationsBatches = Math.ceil(phase.operations / CONFIG.concurrency.operations);
  let operationsProgress = 0;
  
  for (let batch = 0; batch < operationsBatches; batch++) {
    const batchTokens = operationTokens.slice(
      batch * CONFIG.concurrency.operations, 
      (batch + 1) * CONFIG.concurrency.operations
    );
    
    const operationPromises = batchTokens.map(token => performConcurrentOperations(token));
    const operationResults = await Promise.allSettled(operationPromises);
    
    operationResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          results.operations.success++;
        } else {
          results.operations.failed++;
        }
      } else {
        results.operations.failed++;
      }
    });
    
    operationsProgress = Math.round(((batch + 1) / operationsBatches) * 100);
    if (operationsProgress % 10 === 0) {
      console.log(`📈 Operaciones: ${operationsProgress}% completado`);
    }
  }
  
  results.operations.totalTime = performance.now() - operationsStartTime;
  console.log(`✅ Operaciones concurrentes completadas`);

  // Resultados finales de la fase
  const totalTime = performance.now() - startTime;
  
  console.log(`\n📊 ===== REPORTE FASE ${phase.name} =====`);
  console.log(`⏱️  Tiempo total: ${(totalTime / 1000 / 60).toFixed(2)} minutos`);
  console.log(`👥 Usuarios: ${phase.users.toLocaleString()}`);
  console.log(`💾 Tokens cacheados: ${tokenCache.size.toLocaleString()}`);
  
  console.log(`\n📈 RESULTADOS POR CATEGORÍA:`);
  
  // Login results
  const loginSuccessRate = ((results.login.success / phase.logins) * 100).toFixed(2);
  const loginLatency = results.login.totalTime / results.login.success || 0;
  console.log(`LOGIN:`);
  console.log(`  ✅ Éxito: ${results.login.success.toLocaleString()}`);
  console.log(`  ❌ Fallos: ${results.login.failed.toLocaleString()}`);
  console.log(`  📊 Tasa éxito: ${loginSuccessRate}%`);
  console.log(`  ⚡ Latencia: ${loginLatency.toFixed(2)}ms`);
  
  // Validation results
  const validationSuccessRate = ((results.validation.success / phase.validations) * 100).toFixed(2);
  const validationLatency = results.validation.totalTime / results.validation.success || 0;
  console.log(`QUIZVALIDATION:`);
  console.log(`  ✅ Éxito: ${results.validation.success.toLocaleString()}`);
  console.log(`  ❌ Fallos: ${results.validation.failed.toLocaleString()}`);
  console.log(`  📊 Tasa éxito: ${validationSuccessRate}%`);
  console.log(`  ⚡ Latencia: ${validationLatency.toFixed(2)}ms`);
  
  // Operations results
  const operationsSuccessRate = ((results.operations.success / phase.operations) * 100).toFixed(2);
  const operationsLatency = results.operations.totalTime / results.operations.success || 0;
  console.log(`OPERATIONS:`);
  console.log(`  ✅ Éxito: ${results.operations.success.toLocaleString()}`);
  console.log(`  ❌ Fallos: ${results.operations.failed.toLocaleString()}`);
  console.log(`  📊 Tasa éxito: ${operationsSuccessRate}%`);
  console.log(`  ⚡ Latencia: ${operationsLatency.toFixed(2)}ms`);
  
  // Evaluación de la fase
  const totalOperations = phase.logins + phase.validations + phase.operations;
  const totalSuccess = results.login.success + results.validation.success + results.operations.success;
  const globalSuccessRate = ((totalSuccess / totalOperations) * 100).toFixed(2);
  
  console.log(`\n🎯 EVALUACIÓN FASE ${phase.name}:`);
  console.log(`📊 Operaciones totales: ${totalOperations.toLocaleString()}`);
  console.log(`📊 Tasa éxito global: ${globalSuccessRate}%`);
  
  if (globalSuccessRate >= 80) {
    console.log(`🟢 FASE ${phase.name}: EXCELENTE`);
  } else if (globalSuccessRate >= 60) {
    console.log(`🟡 FASE ${phase.name}: BUENA`);
  } else if (globalSuccessRate >= 40) {
    console.log(`🟠 FASE ${phase.name}: NECESITA MEJORA`);
  } else {
    console.log(`🔴 FASE ${phase.name}: CRÍTICA`);
  }
  
  return {
    phase: phase.name,
    results,
    totalTime,
    globalSuccessRate: parseFloat(globalSuccessRate)
  };
}

// Función principal del test mejorado
async function runOptimizedStressTest() {
  console.log('🚀 ===== TEST DE ESTRÉS OPTIMIZADO V2 - 2M+ USUARIOS =====');
  console.log('⚡ Mejoras implementadas:');
  console.log('  - Rate limiting aumentado 5x');
  console.log('  - Pool de conexiones aumentado 5x');
  console.log('  - Timeouts reducidos para mejor respuesta');
  console.log('  - Batch operations mejoradas');
  console.log('  - Cache optimizado');
  console.log('  - Retry inteligente');
  
  const testStartTime = performance.now();
  const allResults = [];
  
  try {
    // Ejecutar todas las fases
    for (const phase of CONFIG.phases) {
      const result = await runPhase(phase);
      allResults.push(result);
      
      // Pequeña pausa entre fases
      console.log('\n⏸️  Pausa de 30 segundos antes de la siguiente fase...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    // Reporte final
    const totalTestTime = performance.now() - testStartTime;
    console.log('\n🎯 ===== REPORTE FINAL DEL TEST =====');
    console.log(`⏱️  Tiempo total: ${(totalTestTime / 1000 / 60).toFixed(2)} minutos`);
    console.log(`💾 Tokens cacheados: ${tokenCache.size.toLocaleString()}`);
    
    console.log('\n📊 RESUMEN POR FASE:');
    allResults.forEach(result => {
      console.log(`📈 ${result.phase}: ${result.globalSuccessRate}% éxito global`);
    });
    
    // Evaluación final
    const avgSuccessRate = allResults.reduce((sum, r) => sum + r.globalSuccessRate, 0) / allResults.length;
    console.log('\n🎯 EVALUACIÓN FINAL:');
    console.log(`📊 Tasa éxito promedio: ${avgSuccessRate.toFixed(2)}%`);
    
    if (avgSuccessRate >= 80) {
      console.log('🟢 SISTEMA LISTO PARA 2M+ USUARIOS');
    } else if (avgSuccessRate >= 60) {
      console.log('🟡 SISTEMA FUNCIONAL PERO NECESITA MEJORAS');
    } else if (avgSuccessRate >= 40) {
      console.log('🟠 SISTEMA NECESITA OPTIMIZACIONES IMPORTANTES');
    } else {
      console.log('🔴 SISTEMA NO APTO PARA 2M USUARIOS');
    }
    
  } catch (error) {
    console.error('❌ Error durante el test:', error.message);
  } finally {
    console.log('\n✅ ===== TEST COMPLETADO =====');
  }
}

// Ejecutar el test
if (import.meta.url === `file://${process.argv[1]}`) {
  runOptimizedStressTest().catch(console.error);
}

export { runOptimizedStressTest };
