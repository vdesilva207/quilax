/**
 * 🎯 TEST DE VALIDACIÓN DE QUIZZES
 * 
 * REGLAS A TESTEAR:
 * - Máximo 20 minutos de duración total
 * - Mínimo 5 preguntas, máximo 50 preguntas  
 * - Prioridad: tiempo > cantidad de preguntas
 */

import { validateQuizRules, calculateQuizDuration, canPublishQuiz } from '../src/utils/quizValidationService.js';

console.log('🎯 INICIANDO TESTS DE VALIDACIÓN DE QUIZZES\n');

// Test 1: Quiz válido (dentro de los límites)
console.log('📝 Test 1: Quiz válido (10 preguntas, 15 minutos)');
const validQuiz = {
  title: 'Quiz de Prueba Válido',
  questions: Array(10).fill(null).map((_, i) => ({
    text: `Pregunta ${i + 1}`,
    readTime: 10,  // 10 segundos lectura
    answerTime: 20, // 20 segundos respuesta
    answers: [
      { text: 'Opción A', isCorrect: true },
      { text: 'Opción B', isCorrect: false },
      { text: 'Opción C', isCorrect: false },
      { text: 'Opción D', isCorrect: false }
    ]
  }))
};

const result1 = validateQuizRules(validQuiz);
console.log('✅ Resultado:', result1.isValid ? 'VÁLIDO' : 'INVÁLIDO');
console.log('📊 Métricas:', result1.metrics);
console.log('⚠️  Advertencias:', result1.warnings);
console.log('');

// Test 2: Quiz excede tiempo (50 preguntas, 25 minutos)
console.log('📝 Test 2: Quiz excede tiempo (50 preguntas, 25 minutos)');
const tooLongQuiz = {
  title: 'Quiz Demasiado Largo',
  questions: Array(50).fill(null).map((_, i) => ({
    text: `Pregunta ${i + 1}`,
    readTime: 15,  // 15 segundos lectura
    answerTime: 15, // 15 segundos respuesta
    answers: [
      { text: 'Opción A', isCorrect: true },
      { text: 'Opción B', isCorrect: false }
    ]
  }))
};

const result2 = validateQuizRules(tooLongQuiz);
console.log('❌ Resultado:', result2.isValid ? 'VÁLIDO' : 'INVÁLIDO');
console.log('📊 Métricas:', result2.metrics);
console.log('🚨 Errores:', result2.errors);
console.log('');

// Test 3: Quiz con pocas preguntas (3 preguntas)
console.log('📝 Test 3: Quiz con pocas preguntas (3 preguntas)');
const tooShortQuiz = {
  title: 'Quiz Demasiado Corto',
  questions: Array(3).fill(null).map((_, i) => ({
    text: `Pregunta ${i + 1}`,
    readTime: 10,
    answerTime: 20,
    answers: [
      { text: 'Opción A', isCorrect: true },
      { text: 'Opción B', isCorrect: false }
    ]
  }))
};

const result3 = validateQuizRules(tooShortQuiz);
console.log('❌ Resultado:', result3.isValid ? 'VÁLIDO' : 'INVÁLIDO');
console.log('📊 Métricas:', result3.metrics);
console.log('🚨 Errores:', result3.errors);
console.log('');

// Test 4: Quiz con muchas preguntas pero tiempo OK (40 preguntas, 18 minutos)
console.log('📝 Test 4: Quiz con muchas preguntas pero tiempo OK (40 preguntas, 18 minutos)');
const manyQuestionsQuiz = {
  title: 'Quiz con Muchas Preguntas',
  questions: Array(40).fill(null).map((_, i) => ({
    text: `Pregunta ${i + 1}`,
    readTime: 8,   // 8 segundos lectura
    answerTime: 19, // 19 segundos respuesta
    answers: [
      { text: 'Opción A', isCorrect: true },
      { text: 'Opción B', isCorrect: false }
    ]
  }))
};

const result4 = validateQuizRules(manyQuestionsQuiz);
console.log('✅ Resultado:', result4.isValid ? 'VÁLIDO' : 'INVÁLIDO');
console.log('📊 Métricas:', result4.metrics);
console.log('⚠️  Advertencias:', result4.warnings);
console.log('');

// Test 5: Test de publicación
console.log('📝 Test 5: Test de publicación');
const publishTest1 = canPublishQuiz(validQuiz);
const publishTest2 = canPublishQuiz(tooLongQuiz);

console.log('📊 Quiz válido puede publicarse:', publishTest1.canPublish ? 'SÍ' : 'NO');
if (!publishTest1.canPublish) console.log('❌ Razones:', publishTest1.reasons);

console.log('📊 Quiz demasiado largo puede publicarse:', publishTest2.canPublish ? 'SÍ' : 'NO');
if (!publishTest2.canPublish) console.log('❌ Razones:', publishTest2.reasons);

console.log('');

// Test 6: Cálculo de duración
console.log('📝 Test 6: Cálculo de duración');
const duration1 = calculateQuizDuration(validQuiz.questions);
const duration2 = calculateQuizDuration(tooLongQuiz.questions);
const duration3 = calculateQuizDuration(manyQuestionsQuiz.questions);

console.log(`⏱️  Quiz válido: ${duration1} minutos`);
console.log(`⏱️  Quiz demasiado largo: ${duration2} minutos`);
console.log(`⏱️  Quiz con muchas preguntas: ${duration3} minutos`);

console.log('\n🎯 TESTS COMPLETADOS');
