/**
 * Sistema oficial de puntuación Quilax
 *
 * Modelo:
 * - Cada pregunta tiene maxScore = 1000
 * - El score baja según el tiempo de respuesta (ms)
 * - Nunca puede ser negativo
 */

const MAX_SCORE = 1000;
const MIN_SCORE = 0;

/*
====================================
CALCULAR SCORE INDIVIDUAL
====================================
responseTimeMs: tiempo en milisegundos desde que empieza la fase de respuesta
*/
export function calculateScore(responseTimeMs) {
  if (typeof responseTimeMs !== "number" || responseTimeMs < 0) {
    return 0;
  }

  const score = MAX_SCORE - responseTimeMs;

  return Math.max(MIN_SCORE, Math.floor(score));
}

/*
====================================
CALCULAR SCORE TOTAL
====================================
answers: [
  { score: number },
  ...
]
*/
export function calculateTotalScore(answers) {
  if (!Array.isArray(answers)) return 0;

  return answers.reduce((total, a) => {
    const score = typeof a.score === "number" ? a.score : 0;
    return total + score;
  }, 0);
}

/*
====================================
RANKING DE JUGADORES
====================================
players: [
  { userId, score },
  ...
]
*/
export function calculateRanking(players) {
  if (!Array.isArray(players)) return [];

  return [...players]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
}