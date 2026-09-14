/**
 * Países de pagos / Stripe Connect — mismos códigos que el registro
 * (quilax-frontend/src/constants/countries.ts).
 *
 * `active`: Stripe Connect Express admite crear cuentas en ese país.
 * El resto se muestra como próximamente (mismo listado de registro).
 */

/** Países donde Stripe Connect Express permite onboarding (platform EU/US típica). */
export const STRIPE_CONNECT_COUNTRIES = new Set([
  "AT",
  "AU",
  "BE",
  "BG",
  "BR",
  "CA",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "JP",
  "LT",
  "LU",
  "LV",
  "MT",
  "MX",
  "NL",
  "NO",
  "NZ",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "US",
]);

/** Moneda por defecto al fijar país (syncCurrency). */
export const CURRENCY_BY_COUNTRY = {
  ES: "EUR",
  PT: "EUR",
  FR: "EUR",
  DE: "EUR",
  IT: "EUR",
  IE: "EUR",
  NL: "EUR",
  BE: "EUR",
  LU: "EUR",
  AT: "EUR",
  FI: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
  SK: "EUR",
  SI: "EUR",
  GR: "EUR",
  CY: "EUR",
  MT: "EUR",
  HR: "EUR",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  BG: "BGN",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  CH: "CHF",
  GB: "GBP",
  US: "USD",
  CA: "CAD",
  MX: "MXN",
  BR: "BRL",
  AR: "ARS",
  CL: "CLP",
  CO: "COP",
  PE: "PEN",
  UY: "UYU",
  VE: "VES",
  EC: "USD",
  BO: "BOB",
  PY: "PYG",
  CR: "CRC",
  PA: "USD",
  DO: "DOP",
  GT: "GTQ",
  HN: "HNL",
  SV: "USD",
  NI: "NIO",
  CU: "CUP",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  KR: "KRW",
  CN: "CNY",
  IN: "INR",
  MA: "MAD",
  DZ: "DZD",
  TN: "TND",
  EG: "EGP",
  ZA: "ZAR",
  TR: "TRY",
  RU: "RUB",
  UA: "UAH",
};

/** Nombre ES de respaldo (los clientes pueden traducir por código). */
const REGION_DEFS = [
  ["ES", "España"],
  ["PT", "Portugal"],
  ["FR", "Francia"],
  ["DE", "Alemania"],
  ["IT", "Italia"],
  ["GB", "Reino Unido"],
  ["IE", "Irlanda"],
  ["NL", "Países Bajos"],
  ["BE", "Bélgica"],
  ["LU", "Luxemburgo"],
  ["AT", "Austria"],
  ["CH", "Suiza"],
  ["PL", "Polonia"],
  ["CZ", "Chequia"],
  ["SK", "Eslovaquia"],
  ["HU", "Hungría"],
  ["RO", "Rumanía"],
  ["BG", "Bulgaria"],
  ["HR", "Croacia"],
  ["SI", "Eslovenia"],
  ["GR", "Grecia"],
  ["CY", "Chipre"],
  ["MT", "Malta"],
  ["SE", "Suecia"],
  ["NO", "Noruega"],
  ["DK", "Dinamarca"],
  ["FI", "Finlandia"],
  ["EE", "Estonia"],
  ["LV", "Letonia"],
  ["LT", "Lituania"],
  ["US", "Estados Unidos"],
  ["CA", "Canadá"],
  ["MX", "México"],
  ["BR", "Brasil"],
  ["AR", "Argentina"],
  ["CL", "Chile"],
  ["CO", "Colombia"],
  ["PE", "Perú"],
  ["UY", "Uruguay"],
  ["VE", "Venezuela"],
  ["EC", "Ecuador"],
  ["BO", "Bolivia"],
  ["PY", "Paraguay"],
  ["CR", "Costa Rica"],
  ["PA", "Panamá"],
  ["DO", "República Dominicana"],
  ["GT", "Guatemala"],
  ["HN", "Honduras"],
  ["SV", "El Salvador"],
  ["NI", "Nicaragua"],
  ["CU", "Cuba"],
  ["AU", "Australia"],
  ["NZ", "Nueva Zelanda"],
  ["JP", "Japón"],
  ["KR", "Corea del Sur"],
  ["CN", "China"],
  ["IN", "India"],
  ["MA", "Marruecos"],
  ["DZ", "Argelia"],
  ["TN", "Túnez"],
  ["EG", "Egipto"],
  ["ZA", "Sudáfrica"],
  ["TR", "Turquía"],
  ["RU", "Rusia"],
  ["UA", "Ucrania"],
];

export const PAYMENT_REGIONS = REGION_DEFS.map(([country, name]) => {
  const currency = CURRENCY_BY_COUNTRY[country] || "EUR";
  // Misma lista seleccionable que el registro. Stripe puede rechazar
  // países sin Connect Express; el onboarding devolverá el error.
  const stripeReady = STRIPE_CONNECT_COUNTRIES.has(country);
  return {
    code: country,
    country,
    name,
    currency,
    currencies: [currency],
    active: true,
    stripeReady,
    ...(stripeReady ? {} : { comingSoon: false }),
  };
});

export function isKnownPaymentCountry(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return PAYMENT_REGIONS.some((r) => r.country === c);
}

export function isActivePaymentCountry(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return STRIPE_CONNECT_COUNTRIES.has(c);
}

export function currencyForCountry(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return CURRENCY_BY_COUNTRY[c] || null;
}
