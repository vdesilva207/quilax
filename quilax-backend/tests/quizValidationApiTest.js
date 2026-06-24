/**
 * 🎯 TEST DE VALIDACIÓN DE QUIZZES - API ENDPOINTS
 * 
 * TESTEA LOS ENDPOINTS REALES PARA VALIDACIÓN
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Token de usuario autenticado (reemplazar con token real)
let authToken = null;

async function loginAndGetToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testuser1@test.com',
        password: 'testpassword123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log('✅ Login exitoso, token obtenido');
      return true;
    } else {
      console.log('❌ Login fallido');
      return false;
    }
  } catch (error) {
    console.error('❌ Error en login:', error.message);
    return false;
  }
}

async function testQuizValidation() {
  console.log('\n🎯 TEST 1: Validar quiz válido');
  
  const validQuiz = {
    title: 'Quiz de Prueba Válido',
    questions: Array(10).fill(null).map((_, i) => ({
      text: `Pregunta ${i + 1}`,
      readTime: 10,
      answerTime: 20,
      answers: [
        { text: 'Opción A', isCorrect: true },
        { text: 'Opción B', isCorrect: false }
      ]
    }))
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/quiz-validation/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(validQuiz)
    });
    
    const result = await response.json();
    console.log('📊 Resultado:', result.isValid ? 'VÁLIDO' : 'INVÁLIDO');
    console.log('⚠️  Advertencias:', result.warnings);
    console.log('📈 Métricas:', result.metrics);
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
  }
}

async function testQuizTooLong() {
  console.log('\n🎯 TEST 2: Validar quiz demasiado largo');
  
  const tooLongQuiz = {
    title: 'Quiz Demasiado Largo',
    questions: Array(50).fill(null).map((_, i) => ({
      text: `Pregunta ${i + 1}`,
      readTime: 15,
      answerTime: 15,
      answers: [
        { text: 'Opción A', isCorrect: true },
        { text: 'Opción B', isCorrect: false }
      ]
    }))
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/quiz-validation/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(tooLongQuiz)
    });
    
    const result = await response.json();
    console.log('📊 Resultado:', result.isValid ? 'VÁLIDO' : 'INVÁLIDO');
    console.log('🚨 Errores:', result.errors);
    console.log('📈 Métricas:', result.metrics);
  } catch (error) {
    console.error('❌ Error en validación:', error.message);
  }
}

async function testDurationCalculation() {
  console.log('\n🎯 TEST 3: Calcular duración');
  
  const questions = Array(20).fill(null).map((_, i) => ({
    text: `Pregunta ${i + 1}`,
    readTime: 12,
    answerTime: 18,
    answers: [
      { text: 'Opción A', isCorrect: true },
      { text: 'Opción B', isCorrect: false }
    ]
  }));
  
  try {
    const response = await fetch(`${BASE_URL}/api/quiz-validation/calculate-duration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ questions })
    });
    
    const result = await response.json();
    console.log('⏱️  Duración total:', result.durationMinutes, 'minutos');
    console.log('✅ Válido:', result.isValid ? 'SÍ' : 'NO');
    console.log('📊 Desglose:', result.breakdown.length, 'preguntas');
  } catch (error) {
    console.error('❌ Error en cálculo:', error.message);
  }
}

async function runAllTests() {
  console.log('🎯 INICIANDO TESTS DE VALIDACIÓN API\n');
  
  // Obtener token primero
  const loginSuccess = await loginAndGetToken();
  if (!loginSuccess) {
    console.log('❌ No se pudo obtener token, abortando tests');
    return;
  }
  
  // Ejecutar tests
  await testQuizValidation();
  await testQuizTooLong();
  await testDurationCalculation();
  
  console.log('\n✅ TESTS API COMPLETADOS');
}

// Ejecutar tests
runAllTests().catch(console.error);
