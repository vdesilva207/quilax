/**
 * IAP credit packs — product IDs must match App Store Connect / Play Console.
 * Soft-launch: exact credits only (no purchase bonus — economic safety).
 *
 * Note: Apple reserves Product IDs forever after first use. `credits_10` was
 * deleted in ASC and cannot be recreated → use `credits_10b`.
 */
export const IAP_CREDIT_PACKS = [
  {
    productId: "credits_5",
    credits: 5,
    bonus: 0,
    label: "5 créditos",
  },
  {
    productId: "credits_10b",
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
    bonus: 0,
    label: "50 créditos",
  },
  {
    productId: "credits_100",
    credits: 100,
    bonus: 0,
    label: "100 créditos",
  },
  {
    productId: "credits_250",
    credits: 250,
    bonus: 0,
    label: "250 créditos",
  },
];

export function packForProductId(productId) {
  return IAP_CREDIT_PACKS.find((p) => p.productId === productId) || null;
}

export function totalCreditsForPack(pack) {
  if (!pack) return 0;
  return pack.credits + (pack.bonus || 0);
}
