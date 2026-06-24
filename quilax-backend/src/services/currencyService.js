import dotenv from 'dotenv';
dotenv.config();

// Tasas de cambio base (1 EUR = X moneda)
// En producción, esto debería venir de una API de tasas de cambio en tiempo real
const EXCHANGE_RATES = {
  EUR: 1.0,
  USD: 1.08,
  GBP: 0.86,
  JPY: 162.50,
  CAD: 1.47,
  AUD: 1.65,
  CHF: 0.97,
  CNY: 7.85,
  INR: 89.50,
  BRL: 5.35,
  MXN: 17.20,
  ARS: 950.00,
  COP: 4100.00,
  CLP: 980.00,
  PEN: 4.05,
  BOB: 7.40,
  UYU: 39.50,
  PYG: 7350.00,
  CRC: 545.00,
  NIO: 37.50,
  HNL: 26.50,
  GTQ: 8.75,
  SVR: 8.90,
  DOP: 58.50,
  KRW: 1450.00,
  SGD: 1.45,
  HKD: 8.40,
  NZD: 1.78,
  ZAR: 20.50,
  RUB: 100.00,
  TRY: 35.50,
  PLN: 4.30,
  SEK: 11.50,
  NOK: 11.80,
  DKK: 7.45,
  CZK: 25.50,
  HUF: 390.00,
  RON: 4.95,
  BGN: 1.95,
  ILS: 4.05,
  AED: 4.00,
  SAR: 4.10,
  QAR: 4.00,
  KWD: 0.34,
  BHD: 0.41,
  OMR: 0.42,
  THB: 38.50,
  MYR: 5.15,
  IDR: 17000.00,
  PHP: 62.00,
  VND: 27000.00,
  EGP: 33.50,
  NGN: 1650.00,
  KES: 160.00,
  GHS: 15.50,
  ZMW: 28.50,
  UAH: 42.00,
};

// Nombres de monedas
const CURRENCY_NAMES = {
  EUR: 'Euro',
  USD: 'Dólar Estadounidense',
  GBP: 'Libra Esterlina',
  JPY: 'Yen Japonés',
  CAD: 'Dólar Canadiense',
  AUD: 'Dólar Australiano',
  CHF: 'Franco Suizo',
  CNY: 'Yuan Chino',
  INR: 'Rupia India',
  BRL: 'Real Brasileño',
  MXN: 'Peso Mexicano',
  ARS: 'Peso Argentino',
  COP: 'Peso Colombiano',
  CLP: 'Peso Chileno',
  PEN: 'Sol Peruano',
  BOB: 'Boliviano',
  UYU: 'Peso Uruguayo',
  PYG: 'Guaraní',
  CRC: 'Colón Costarricense',
  NIO: 'Córdoba',
  HNL: 'Lempira',
  GTQ: 'Quetzal',
  SVR: 'Dólar Salvadoreño',
  DOP: 'Peso Dominicano',
  KRW: 'Won Surcoreano',
  SGD: 'Dólar Singapurense',
  HKD: 'Dólar de Hong Kong',
  NZD: 'Dólar Neozelandés',
  ZAR: 'Rand Sudafricano',
  RUB: 'Rublo Ruso',
  TRY: 'Lira Turca',
  PLN: 'Złoty Polaco',
  SEK: 'Corona Sueca',
  NOK: 'Corona Noruega',
  DKK: 'Corona Danesa',
  CZK: 'Corona Checa',
  HUF: 'Forinto Húngaro',
  RON: 'Leu Rumano',
  BGN: 'Lev Búlgaro',
  ILS: 'Shekel Israelí',
  AED: 'Dirham Emiratí',
  SAR: 'Riyal Saudí',
  QAR: 'Riyal Catarí',
  KWD: 'Dinar Kuwaití',
  BHD: 'Dinar Bahreiní',
  OMR: 'Rial Omaní',
  THB: 'Baht Tailandés',
  MYR: 'Ringgit Malayo',
  IDR: 'Rupia Indonesia',
  PHP: 'Peso Filipino',
  VND: 'Dong Vietnamita',
  EGP: 'Libra Egipcia',
  NGN: 'Naira Nigeriana',
  KES: 'Chelín Keniano',
  GHS: 'Cedi Ghanés',
  ZMW: 'Kwacha Zambiano',
  UAH: 'Grivna Ucraniana',
};

/**
 * Obtener todas las tasas de cambio disponibles
 */
export function getAllExchangeRates() {
  return EXCHANGE_RATES;
}

/**
 * Obtener tasa de cambio para una moneda específica
 * @param {string} currency - Código de moneda (ej: USD, EUR)
 * @returns {number} - Tasa de cambio (1 EUR = X moneda)
 */
export function getExchangeRate(currency) {
  return EXCHANGE_RATES[currency] || 1.0;
}

/**
 * Convertir créditos a moneda local
 * @param {number} credits - Cantidad de créditos
 * @param {string} currency - Moneda de destino
 * @returns {number} - Cantidad en moneda local
 */
export function creditsToCurrency(credits, currency) {
  const rate = getExchangeRate(currency);
  return credits * rate;
}

/**
 * Convertir moneda local a créditos
 * @param {number} amount - Cantidad en moneda local
 * @param {string} currency - Moneda de origen
 * @returns {number} - Cantidad en créditos
 */
export function currencyToCredits(amount, currency) {
  const rate = getExchangeRate(currency);
  return amount / rate;
}

/**
 * Obtener nombre de moneda
 * @param {string} currency - Código de moneda
 * @returns {string} - Nombre de moneda
 */
export function getCurrencyName(currency) {
  return CURRENCY_NAMES[currency] || currency;
}

/**
 * Obtener lista de todas las monedas disponibles
 * @returns {Array} - Lista de monedas con código y nombre
 */
export function getAvailableCurrencies() {
  return Object.keys(EXCHANGE_RATES).map(code => ({
    code,
    name: CURRENCY_NAMES[code] || code,
    rate: EXCHANGE_RATES[code]
  }));
}

/**
 * Actualizar tasas de cambio (para uso futuro con API externa)
 * @param {Object} newRates - Nuevas tasas de cambio
 */
export function updateExchangeRates(newRates) {
  Object.assign(EXCHANGE_RATES, newRates);
}
