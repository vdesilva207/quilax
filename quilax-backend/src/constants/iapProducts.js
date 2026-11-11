/**
 * IAP credit packs — product IDs must match App Store Connect / Play Console.
 * Store SKUs grant base credits (+ optional bonus aligned with Stripe packages).
 */
export const IAP_CREDIT_PACKS = [
  {
    productId: "credits_5",
    credits: 5,
    bonus: 0,
    label: "5 créditos",
  },
  {
    productId: "credits_10",
    credits: 10,
    bonus: 0,
    label: "10 créditos",
  },
  {
    productId: "credits_20",
    credits: 20,
    bonus: 0,
    label: "20 créditos",
  },
  {
    productId: "credits_50",
    credits: 50,
    bonus: 5,
    label: "50 créditos (+5)",
  },
  {
    productId: "credits_100",
    credits: 100,
    bonus: 15,
    label: "100 créditos (+15)",
  },
  {
    productId: "credits_250",
    credits: 250,
    bonus: 40,
    label: "250 créditos (+40)",
  },
];

export function packForProductId(productId) {
  return IAP_CREDIT_PACKS.find((p) => p.productId === productId) || null;
}

export function totalCreditsForPack(pack) {
  if (!pack) return 0;
  return pack.credits + (pack.bonus || 0);
}
