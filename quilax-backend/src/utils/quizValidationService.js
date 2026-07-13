/**
 * 🎯 SERVICIO DE VALIDACIÓN DE QUIZZES
 * 
 * REGLAS:
 * - Máximo 20 minutos de duración total
 * - Mínimo 5 preguntas, máximo 50 preguntas
 * - Prioridad: tiempo > cantidad de preguntas
 */

export function calculateQuizDuration(questions) {
  if (!questions || questions.length === 0) return 0;
  
  const totalSeconds = questions.reduce((total, question) => {
    const preQuestionTime = 3;  // PRE_QUESTION: 3s automático
    const readTime = question.readTime || 10;  // Default 10s lectura
    const answerTime = question.answerTime || 30; // Default 30s respuesta
    const questionCorrectionTime = 3;  // QUESTION_CORRECTION: 3s automático
    const currentRankingTime = 6;  // CURRENT_RANKING: 6s automático
    return total + preQuestionTime + readTime + answerTime + questionCorrectionTime + currentRankingTime;
  }, 0);
  
  return Math.round(totalSeconds / 60); // Convertir a minutos
}

export function validateQuizRules(quiz) {
  const errors = [];
  const warnings = [];
  
  // 1. Validar cantidad de preguntas
  const questionCount = quiz.questions?.length || 0;
  
  if (questionCount < 5) {
    errors.push("Un quiz debe tener al menos 5 preguntas");
  }
  
  if (questionCount > 50) {
    errors.push("Un quiz no puede tener más de 50 preguntas");
  }
  
  // 2. Calcular duración estimada
  const estimatedDuration = calculateQuizDuration(quiz.questions);
  
  // 3. Validar duración máxima (REGLA PRINCIPAL)
  if (estimatedDuration > 20) {
    errors.push(`El quiz dura ${estimatedDuration} minutos. El máximo permitido es 20 minutos`);
  }
  
  // 4. Validaciones adicionales
  if (!quiz.title || quiz.title.trim().length < 3) {
    errors.push("El título debe tener al menos 3 caracteres");
  }
  
  if (quiz.title && quiz.title.length > 200) {
    errors.push("El título no puede exceder 200 caracteres");
  }
  
  // 5. Advertencias informativas
  if (estimatedDuration > 15 && estimatedDuration <= 20) {
    warnings.push(`El quiz dura ${estimatedDuration} minutos. Está cerca del límite máximo de 20 minutos`);
  }
  
  if (questionCount >= 40 && questionCount <= 50) {
    warnings.push(`El quiz tiene ${questionCount} preguntas. Asegúrate de que la duración no exceda 20 minutos`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      questionCount,
      estimatedDuration,
      maxAllowedDuration: 20,
      minQuestions: 5,
      maxQuestions: 50
    }
  };
}

export function canPublishQuiz(quiz) {
  const validation = validateQuizRules(quiz);
  
  return {
    canPublish: validation.isValid,
    reasons: validation.errors,
    warnings: validation.warnings,
    metrics: validation.metrics
  };
}

export function calculatePointsPerDecisecond(question) {
  const answerTime = question.answerTime || 30; // Tiempo ANSWER en segundos
  const totalDeciseconds = answerTime * 10; // Convertir a décimas de segundo
  
  // Calcular puntos para que llegue a 0 al final del tiempo
  const pointsPerDecisecond = 1000 / totalDeciseconds; // 1000 puntos base dividido por décimas totales
  
  return Math.ceil(pointsPerDecisecond); // Redondear hacia arriba
}

export function recommendPointsPerDecisecond(questions) {
  if (!questions || questions.length === 0) return 0;
  
  // Usar el tiempo ANSWER promedio de todas las preguntas
  const avgAnswerTime = questions.reduce((sum, q) => sum + (q.answerTime || 30), 0) / questions.length;
  
  return calculatePointsPerDecisecond({ answerTime: avgAnswerTime });
}

export function getQuizTimeBreakdown(questions) {
  if (!questions || questions.length === 0) {
    return {
      totalMinutes: 0,
      totalSeconds: 0,
      averageTimePerQuestion: 0,
      breakdown: []
    };
  }
  
  let totalSeconds = 0;
  const breakdown = questions.map((question, index) => {
    const preQuestionTime = 3;  // PRE_QUESTION automático
    const readTime = question.readTime || 10;
    const answerTime = question.answerTime || 30;
    const questionCorrectionTime = 3;  // QUESTION_CORRECTION automático
    const currentRankingTime = 6;  // CURRENT_RANKING automático
    const questionTime = preQuestionTime + readTime + answerTime + questionCorrectionTime + currentRankingTime;
    totalSeconds += questionTime;
    
    return {
      questionIndex: index + 1,
      preQuestionTime,
      readTime,
      answerTime,
      questionCorrectionTime,
      currentRankingTime,
      totalTime: questionTime,
      recommendedPointsPerDecisecond: calculatePointsPerDecisecond(question)
    };
  });
  
  return {
    totalMinutes: Math.round(totalSeconds / 60),
    totalSeconds,
    averageTimePerQuestion: Math.round(totalSeconds / questions.length),
    breakdown,
    recommendedPointsPerDecisecond: recommendPointsPerDecisecond(questions)
  };
}
