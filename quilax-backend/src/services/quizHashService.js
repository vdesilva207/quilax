import crypto from "crypto";

/*
====================================
NORMALIZAR TEXTO
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
GENERAR HASH
====================================
*/
export function generateQuizHash(quiz) {
  if (!quiz || !quiz.questions) throw new Error("Quiz inválido");

  const base = [
    normalize(quiz.title),
    ...quiz.questions.map((q) => {
      const qText = normalize(q.text);

      const answers = q.answers
        .map((a) => normalize(a.text))
        .sort()
        .join("|");

      return `${qText}:${answers}`;
    }),
  ]
    .sort()
    .join("||");

  return crypto.createHash("sha256").update(base).digest("hex");
}

/*
====================================
SIMILITUD (JACCARD)
====================================
*/
function textToSet(text) {
  return new Set(normalize(text).split(" "));
}

function similarity(a, b) {
  const setA = textToSet(a);
  const setB = textToSet(b);

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/*
====================================
SIMILITUD QUIZ
====================================
*/
export function calculateQuizSimilarity(q1, q2) {
  if (!q1 || !q2) return 0;

  let score = similarity(q1.title, q2.title);

  const min = Math.min(q1.questions.length, q2.questions.length);

  for (let i = 0; i < min; i++) {
    score += similarity(q1.questions[i].text, q2.questions[i].text);
  }

  return score / (min + 1);
}