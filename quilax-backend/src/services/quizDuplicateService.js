import prisma from "../lib/prisma.js";
import crypto from "crypto";

/*
====================================
NORMALIZAR TEXTO (ANTI TRAMPAS)
====================================
*/
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/*
====================================
GENERAR HASH QUIZ
====================================
*/
export function generateQuizHash(quiz) {
  if (!quiz.questions) {
    throw new Error("Quiz inválido para hash");
  }

  const content = quiz.questions
    .map((q) => {
      const questionText = normalize(q.text);

      const answers = q.answers
        .map((a) => `${normalize(a.text)}-${a.isCorrect}`)
        .sort()
        .join("|");

      return `${questionText}:${answers}`;
    })
    .sort()
    .join("||");

  return crypto.createHash("sha256").update(content).digest("hex");
}

/*
====================================
DUPLICADO EXACTO
====================================
*/
export async function isDuplicateQuiz(quiz) {
  const hash = generateQuizHash(quiz);

  const existing = await prisma.quiz.findFirst({
    where: {
},
  });

  return existing !== null;
}

/*
====================================
GUARDAR HASH
====================================
*/
export async function saveQuizHash(quizId, quiz) {
  const hash = generateQuizHash(quiz);

  await prisma.quiz.update({
    where: { id: quizId },
    data: {
},
  });

  return hash;
}