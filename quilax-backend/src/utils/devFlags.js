export const isDev = process.env.NODE_ENV !== "production";
export const isTest = process.env.NODE_ENV === "test";

export function isDevFlag(name) {
  const key = `DEV_${String(name).toUpperCase()}`;
  const value = process.env[key];
  if (value === undefined) return isDev;
  return value === "true" || value === "1";
}

export function exposeVerificationCodes() {
  return isDev && isDevFlag("EXPOSE_VERIFICATION_CODES");
}

export function skipGeoRestrictions() {
  return isDev && isDevFlag("SKIP_GEO");
}

export function autoVerifyBankAccount() {
  return isDev && isDevFlag("AUTO_BANK_VERIFY");
}

export default {
  isDev,
  isTest,
  isDevFlag,
  exposeVerificationCodes,
  skipGeoRestrictions,
  autoVerifyBankAccount,
};
