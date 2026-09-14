/**
 * Early Join Bonus — fuente de verdad (backend).
 * La UI espeja estos tramos en quilax-frontend/src/utils/earlyJoinBonus.js
 *
 * Motivo de producto: premios bajos al inicio → bonus por apuntarse pronto
 * para empujar la masa crítica de jugadores (hasta posición 500).
 */

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
  { from: 101, to: 150, bonus: 55 },
  { from: 151, to: 200, bonus: 45 },
  { from: 201, to: 300, bonus: 35 },
  { from: 301, to: 400, bonus: 25 },
  { from: 401, to: 500, bonus: 15 },
];

export const EARLY_JOIN_BONUS_MAX_POSITION = 500;

export function getEarlyJoinBonus(joinPosition) {
  const pos = Number(joinPosition);
  if (!Number.isFinite(pos) || pos < 1) return 0;
  const range = EARLY_JOIN_BONUS_RANGES.find(
    ({ from, to }) => pos >= from && pos <= to
  );
  return range ? range.bonus : 0;
}

export function buildEarlyJoinPreview(nextJoinPosition = 1) {
  const pos = Math.max(1, Number(nextJoinPosition) || 1);
  const bonus = getEarlyJoinBonus(pos);
  return {
    nextJoinPosition: pos,
    bonus,
    maxBonus: EARLY_JOIN_BONUS_RANGES[0]?.bonus ?? 600,
    maxPosition: EARLY_JOIN_BONUS_MAX_POSITION,
    stillAvailable: pos <= EARLY_JOIN_BONUS_MAX_POSITION,
    tiers: EARLY_JOIN_BONUS_RANGES.map(({ from, to, bonus: b }) => ({
      from,
      to,
      bonus: b,
    })),
  };
}
