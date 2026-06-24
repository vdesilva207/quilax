/**
 * 🔍 TEST SIMPLE DE LOGIN PARA DEBUG
 * 
 * Test básico para identificar el problema del login
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function testSingleLogin() {
  console.log('🔍 Test simple de login...');
  
  const testUser = {
    email: `debuguser${Date.now()}@test.com`,
    password: 'TestPassword123!'
  };

  try {
    // Primero registrar el usuario
    console.log('📝 Registrando usuario...');
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, testUser, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DebugTest/1.0'
      }
    });
    
    console.log('✅ Registro exitoso:', registerResponse.data.user?.email);

    // Luego intentar login
    console.log('🔐 Intentando login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DebugTest/1.0'
      }
    });

    console.log('✅ Login exitoso:', {
      email: loginResponse.data.user?.email,
      token: loginResponse.data.token ? 'Recibido' : 'No recibido',
      userId: loginResponse.data.user?.id
    });

    return { success: true, data: loginResponse.data };

  } catch (error) {
    console.error('❌ Error en test:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      code: error.code
    });
    
    return { success: false, error };
  }
}

async function testMultipleLogins() {
  console.log('\n🔍 Test de múltiples logins...');
  
  const users = [];
  for (let i = 0; i < 10; i++) {
    users.push({
      email: `multitest${Date.now()}_${i}@test.com`,
      password: 'TestPassword123!'
    });
  }

  const results = [];
  
  // Registrar usuarios
  console.log('📝 Registrando usuarios...');
  for (const user of users) {
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, user, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DebugTest/1.0'
        }
      });
      console.log(`✅ Usuario registrado: ${user.email}`);
    } catch (error) {
      console.error(`❌ Error registrando ${user.email}:`, error.response?.data?.message || error.message);
    }
  }

  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Intentar logins concurrentes
  console.log('🔐 Intentando logins concurrentes...');
  const loginPromises = users.map(user => 
    axios.post(`${BASE_URL}/api/auth/login`, {
      email: user.email,
      password: user.password
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DebugTest/1.0'
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
  
  loginResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({
        success: false,
        email: users[index].email,
        error: result.reason.message
      });
    }
  });

  console.log('\n📊 Resultados del test concurrente:');
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.email}: Login exitoso`);
    } else {
      console.log(`❌ ${result.email}: ${result.error} (Status: ${result.status || 'N/A'})`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`\n📈 Resumen: ${successCount} éxito, ${failureCount} fallos (${((successCount/results.length)*100).toFixed(1)}% éxito)`);
  
  return results;
}

async function checkServerHealth() {
  console.log('\n🏥 Verificando salud del servidor...');
  
  try {
    const healthResponse = await axios.get(`${BASE_URL}/health`, {
      timeout: 5000
    });
    
    console.log('✅ Servidor saludable:', healthResponse.data);
    return true;
  } catch (error) {
    console.error('❌ Servidor no saludable:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 ===== TEST SIMPLE DE LOGIN PARA DEBUG =====');
  
  // Verificar salud del servidor
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log('❌ El servidor no está saludable. Abortando test.');
    return;
  }

  // Test simple
  await testSingleLogin();
  
  // Esperar un poco
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test concurrente
  await testMultipleLogins();
  
  console.log('\n✅ ===== TEST COMPLETADO =====');
}

// Ejecutar el test
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, testSingleLogin, testMultipleLogins, checkServerHealth };
