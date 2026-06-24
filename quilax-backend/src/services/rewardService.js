import prisma from "../lib/prisma.js";

export async function validateRewardDistribution(quizId) {
  const rules = await prisma.rewardRule.findMany({
    where: { quizId },
  });

  let total = 5; // 👈 jackpot obligatorio

  for (const rule of rules) {
    if (rule.type === "POSITION") {
      const count = rule.positionTo - rule.positionFrom + 1;
      total += rule.percent * count;
    }

    if (rule.type === "CREATOR" || rule.type === "ADMIN") {
      total += rule.percent;
    }
  }

  const roundedTotal = Math.round(total * 10000) / 10000;

  return {
    totalPercent: roundedTotal,
    isValid: roundedTotal === 100,
  };
}

if (rule.percent < 0 || rule.percent > 100) {
  throw new Error("Invalid reward percent");
}