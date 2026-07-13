// Early Join Bonus Ranges - Mismos rangos que en el backend
export const EARLY_JOIN_BONUS_RANGES = [
  { from: 1, to: 1, bonus: 600 },
  { from: 2, to: 5, bonus: 520 },
  { from: 6, to: 10, bonus: 450 },
  { from: 11, to: 20, bonus: 360 },
  { from: 21, to: 30, bonus: 285 },
  { from: 31, to: 40, bonus: 225 },
  { from: 41, to: 50, bonus: 175 },
  { from: 51, to: 60, bonus: 140 },
  { from: 61, to: 70, bonus: 115 },
  { from: 71, to: 80, bonus: 95 },
  { from: 81, to: 89, bonus: 80 },
  { from: 90, to: 100, bonus: 70 },
];

/**
 * Calcula el bonus de inscripción temprana basado en la posición de inscripción
 * @param {number} joinPosition - Posición de inscripción del usuario
 * @returns {number} Bonus de puntos para inscripciones tempranas
 */
export function getEarlyJoinBonus(joinPosition) {
  const range = EARLY_JOIN_BONUS_RANGES.find(
    ({ from, to }) => joinPosition >= from && joinPosition <= to
  );

  return range ? range.bonus : 0;
}

/**
 * Obtiene la descripción del bonus basado en la posición
 * @param {number} joinPosition - Posición de inscripción del usuario
 * @returns {string} Descripción del bonus
 */
export function getEarlyJoinBonusDescription(joinPosition) {
  const bonus = getEarlyJoinBonus(joinPosition);
  
  if (bonus === 0) {
    return 'Sin bonus de inscripción temprana';
  }
  
  if (joinPosition === 1) {
    return `¡Primero en inscribirse! +${bonus} puntos`;
  }
  
  return `Posición ${joinPosition}: +${bonus} puntos`;
}

/**
 * Verifica si el usuario tiene bonus de inscripción temprana
 * @param {number} joinPosition - Posición de inscripción del usuario
 * @returns {boolean} True si tiene bonus
 */
export function hasEarlyJoinBonus(joinPosition) {
  return getEarlyJoinBonus(joinPosition) > 0;
}
