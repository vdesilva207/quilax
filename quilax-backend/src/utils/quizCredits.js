import { buildGlobalPrizePreview } from "../services/prizeConfigService.js";

/**
 * Calcula preview de premios máximos posibles.
 * Usa las mismas reglas globales que el payout (panel admin).
 */
export async function calculateMaxCredits(quizId, totalPrizeCredits) {
  void quizId;
  const preview = await buildGlobalPrizePreview(totalPrizeCredits);
  return (preview.positions || []).map((p, idx) => {
    const from = p.fromPosition;
    const to = p.toPosition;
    const positionsCount = to - from + 1;
    const totalCredits = Number(p.credits || 0) * positionsCount;
    return {
      id: idx + 1,
      type: "POSITION",
      from,
      to,
      percent: p.percentage,
      positionsCount,
      creditsPerWinner: p.credits,
      totalCredits,
    };
  });
}

export function aggregateMaxCredits(rulesWithCredits = []) {
  return rulesWithCredits.reduce(
    (sum, rule) => sum + Number(rule.totalCredits || 0),
    0
  );
}

/**
 * Shape expected by the quiz detail FE — aligned with live payout.
 */
export async function buildPrizePreview(quizId, totalPrizeCredits = 0) {
  void quizId;
  return buildGlobalPrizePreview(totalPrizeCredits);
}
