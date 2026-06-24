/**
 * 🔍 TEST DE CONCURRENCIA REDUCIDA PARA DEBUG
 * 
 * Test incremental para identificar el punto de ruptura
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Configuración incremental
const CONCURRENCY_LEVELS = [1, 5, 10, 25, 50, 100, 250, 500];
const USERS_PER_LEVEL = 100;

async function testConcurrencyLevel(level, concurrency) {
  console.log(`\n🔍 Test con concurrencia: ${concurrency} usuarios simultáneos`);
  
  const users = [];
  for (let i = 0; i < USERS_PER_LEVEL; i++) {
    users.push({
      email: `conc${level}_${i}_${Date.now()}@test.com`,
      password: 'TestPassword123!'
    });
  }

  // Registrar usuarios primero
  console.log(`📝 Registrando ${USERS_PER_LEVEL} usuarios...`);
  const registerPromises = users.map(user => 
    axios.post(`${BASE_URL}/api/auth/register`, user, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ConcurrencyTest/1.0'
      }
    }).catch(error => ({ error: true, message: error.message }))
  );

  const registerResults = await Promise.allSettled(registerPromises);
  const successfulRegistrations = registerResults.filter(r => r.status === 'fulfilled' && !r.value.error);
  console.log(`✅ Registrados: ${successfulRegistrations.length}/${USERS_PER_LEVEL}`);

  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test de logins con concurrencia específica
  console.log(`🔐 Test de login con ${concurrency} usuarios simultáneos...`);
  const startTime = Date.now();
  
  const loginBatches = Math.ceil(USERS_PER_LEVEL / concurrency);
  let successCount = 0;
  let failCount = 0;

  for (let batch = 0; batch < loginBatches; batch++) {
    const batchUsers = users.slice(
      batch * concurrency, 
      Math.min((batch + 1) * concurrency, USERS_PER_LEVEL)
    );

    const loginPromises = batchUsers.map(user => 
      axios.post(`${BASE_URL}/api/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ConcurrencyTest/1.0'
        }
      }).then(response => ({
        success: true,
        email: user.email,
        token: response.data.token ? 'Recibido' : 'No recibido'
      })).catch(error => ({
        success: false,
        email: user.email,
        error: error.response?.data?.message || error.message,
        status: error.response?.status
      }))
    );

    const loginResults = await Promise.allSettled(loginPromises);
    
    loginResults.forEach(result => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successCount++;
        } else {
          failCount++;
        }
      } else {
        failCount++;
      }
    });

    console.log(`📈 Batch ${batch + 1}/${loginBatches}: ${successCount} éxito, ${failCount} fallos`);
  }

  const totalTime = Date.now() - startTime;
  const successRate = ((successCount / USERS_PER_LEVEL) * 100).toFixed(1);

  console.log(`\n📊 RESULTADOS NIVEL ${concurrency}:`);
  console.log(`  ✅ Éxito: ${successCount}/${USERS_PER_LEVEL} (${successRate}%)`);
  console.log(`  ❌ Fallos: ${failCount}/${USERS_PER_LEVEL}`);
  console.log(`  ⏱️  Tiempo: ${totalTime}ms`);
  console.log(`  ⚡ Latencia promedio: ${(totalTime / successCount).toFixed(2)}ms`);

  return {
    concurrency,
    totalUsers: USERS_PER_LEVEL,
    success: successCount,
    failed: failCount,
    successRate: parseFloat(successRate),
    totalTime,
    avgLatency: totalTime / successCount || 0
  };
}

async function main() {
  console.log('🚀 ===== TEST DE CONCURRENCIA REDUCIDA =====');
  console.log('🎯 Objetivo: Identificar el punto de ruptura del sistema');

  const results = [];

  // Verificar servidor
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Servidor saludable:', healthResponse.data.status);
  } catch (error) {
    console.error('❌ Servidor no saludable:', error.message);
    return;
  }

  // Test incremental de concurrencia
  for (let i = 0; i < CONCURRENCY_LEVELS.length; i++) {
    const level = i + 1;
    const concurrency = CONCURRENCY_LEVELS[i];
    
    const result = await testConcurrencyLevel(level, concurrency);
    results.push(result);

    // Pausa entre niveles
    if (i < CONCURRENCY_LEVELS.length - 1) {
      console.log('\n⏸️  Pausa de 10 segundos...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  // Análisis final
  console.log('\n🎯 ===== ANÁLISIS FINAL =====');
  console.log('📈 Resultados por nivel de concurrencia:');
  
  results.forEach(result => {
    const status = result.successRate >= 80 ? '🟢' : 
                  result.successRate >= 60 ? '🟡' : 
                  result.successRate >= 40 ? '🟠' : '🔴';
    
    console.log(`${status} ${result.concurrency} concurrentes: ${result.successRate}% éxito (${result.success}✅/${result.failed}❌)`);
  });

  // Identificar punto de ruptura
  const breakingPoint = results.find(r => r.successRate < 50);
  if (breakingPoint) {
    console.log(`\n🚨 PUNTO DE RUPTURA IDENTIFICADO: ${breakingPoint.concurrency} usuarios concurrentes`);
    console.log(`📉 Tasa de éxito cae a ${breakingPoint.successRate}%`);
  } else {
    console.log('\n✅ No se encontró punto de ruptura en los niveles probados');
  }

  // Recomendaciones
  const bestResult = results.reduce((best, current) => 
    current.successRate > best.successRate ? current : best
  );

  console.log(`\n🏆 MEJOR RENDIMIENTO: ${bestResult.concurrency} concurrentes con ${bestResult.successRate}% éxito`);
  
  if (bestResult.successRate < 80) {
    console.log('\n🔧 RECOMENDACIONES:');
    console.log('  - Reducir timeouts de login');
    console.log('  - Aumentar rate limiting');
    console.log('  - Optimizar pool de conexiones');
    console.log('  - Implementar cola de procesamiento');
  }

  console.log('\n✅ ===== TEST COMPLETADO =====');
}

// Ejecutar el test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, testConcurrencyLevel };
