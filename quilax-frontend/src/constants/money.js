export const CREDIT_TO_EUR = 1;
export const QUIZ_ENTRY_COST = 1;
export const MIN_WITHDRAW = 5;

export function creditsToEur(credits) {
  return credits * CREDIT_TO_EUR;
}

export function eurToCredits(eur) {
  return Math.floor(eur / CREDIT_TO_EUR);
}
