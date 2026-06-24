const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 5;

const MAX_DURATION_MS = 20 * 60 * 1000;
const MIN_ANSWERS = 2;
const MAX_ANSWERS = 10;

/*
====================================
VALIDACIÓN PRINCIPAL
====================================
*/
export function validateQuiz(quiz) {
  if (!quiz) throw new Error("Quiz inválido");

  if (!quiz.title || quiz.title.trim().length === 0) {
    throw new Error("El quiz debe tener título");
  }

  if (quiz.title.length > 100) {
    throw new Error("Título demasiado largo");
  }

  validateQuestions(quiz.questions);
}

/*
====================================
PREGUNTAS
====================================
*/
function validateQuestions(questions) {
  if (!Array.isArray(questions)) {
    throw new Error("Formato de preguntas inválido");
  }

  if (questions.length < MIN_QUESTIONS) {
    throw new Error(`Mínimo ${MIN_QUESTIONS} preguntas`);
  }

  if (questions.length > MAX_QUESTIONS) {
    throw new Error(`Máximo ${MAX_QUESTIONS} preguntas`);
  }

  const seen = new Set();

  for (const q of questions) {
    validateQuestion(q);

    const normalized = q.text.toLowerCase().trim();
    if (seen.has(normalized)) {
      throw new Error("Preguntas duplicadas en el quiz");
    }
    seen.add(normalized);
  }

  validateDuration(questions);
}

/*
====================================
PREGUNTA
====================================
*/
function validateQuestion(q) {
  if (!q.text || q.text.trim() === "") {
    throw new Error("Pregunta sin texto");
  }

  if (!q.answers) {
    throw new Error("Pregunta sin respuestas");
  }

  if (q.timeReadMs == null || q.timeAnswerMs == null) {
    throw new Error("Faltan tiempos de pregunta");
  }

  validateAnswers(q.answers);
}

/*
====================================
RESPUESTAS
====================================
*/
function validateAnswers(answers) {
  if (!Array.isArray(answers)) {
    throw new Error("Formato de respuestas inválido");
  }

  if (answers.length < MIN_ANSWERS) {
    throw new Error("Mínimo 2 respuestas");
  }

  if (answers.length > MAX_ANSWERS) {
    throw new Error("Máximo 10 respuestas");
  }

  let correct = 0;
  const texts = new Set();

  for (const a of answers) {
    if (!a.text || a.text.trim() === "") {
      throw new Error("Respuesta vacía");
    }

    const norm = a.text.toLowerCase().trim();
    if (texts.has(norm)) {
      throw new Error("Respuestas duplicadas");
    }
    texts.add(norm);

    if (a.isCorrect) correct++;
  }

  if (correct !== 1) {
    throw new Error("Debe haber exactamente 1 respuesta correcta");
  }
}

/*
====================================
REGLA 20 MINUTOS REAL
====================================
*/
function validateDuration(questions) {
  let total = 0;

  for (const q of questions) {
    total += q.timeReadMs;
    total += q.timeAnswerMs;
    total += 2000; // correction
    total += 6000; // ranking
  }

  if (total > MAX_DURATION_MS) {
    throw new Error("Duración máxima: 20 minutos");
  }
}