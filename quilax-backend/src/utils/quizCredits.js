import prisma from "../lib/prisma.js";

/**
 * Calcula preview de premios máximos posibles
 * NO hace reparto real
 */
export async function calculateMaxCredits(quizId, totalPrizeCredits) {
  const rules = await prisma.rewardRule.findMany({
    where: { quizId },
    orderBy: { positionFrom: "asc" },
  });

  function roundCredits(value) {
  return Math.round(value * 100) / 100;
}

  let totalPercent = 0;

  const result = rules.map((rule) => {
    const from = rule.positionFrom ?? rule.positionFrom;
    const to = rule.positionTo ?? rule.positionTo;

    if (from == null || to == null || to < from) {
      throw new Error("RewardRule inválida");
    }

    const positionsCount = to - from + 1;

    const percent = Number(rule.percent ?? rule.percentage ?? 0);

    totalPercent += percent;

    const totalCredits =
  totalPrizeCredits * (percent / 100);

 const creditsPerWinner = roundCredits(
  totalCredits / positionsCount
 );

 const totalCreditsRounded = roundCredits(totalCredits);

      function roundCredits(value) {
     return Math.round(value * 100) / 100; // 2 decimales
     }

    return {
      id: rule.id,
      type: rule.type,
      from,
      to,
      percent,
      positionsCount,
      creditsPerWinner,
      totalCredits,
    };
  });

  if (totalPercent > 100) {
    throw new Error("Las reward rules exceden el 100%");
  }

  return result;
}

/**
 * Suma total de créditos asignados en el preview
 */
export function aggregateMaxCredits(preview) {
  if (!Array.isArray(preview)) return 0;

  return preview.reduce((sum, item) => {
    return sum + Number(item.totalCredits || 0);
  }, 0);
}
