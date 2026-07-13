export function normalizeIban(iban) {
  return String(iban || "").replace(/\s/g, "").toUpperCase();
}

export function normalizeBic(bic) {
  return String(bic || "").replace(/\s/g, "").toUpperCase();
}

export function isValidIban(iban) {
  const cleanIban = normalizeIban(iban);
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleanIban);
}

export function isValidBic(bic) {
  const cleanBic = normalizeBic(bic);
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
}

export function maskIban(iban) {
  const clean = normalizeIban(iban);
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
}

export function maskAccountName(name) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 2) return `${trimmed[0]}*`;
  return `${trimmed[0]}${"*".repeat(Math.max(trimmed.length - 2, 1))}${trimmed.slice(-1)}`;
}

export function getCountryFromIban(iban) {
  return normalizeIban(iban).slice(0, 2) || null;
}

export default {
  normalizeIban,
  normalizeBic,
  isValidIban,
  isValidBic,
  maskIban,
  maskAccountName,
  getCountryFromIban,
};
