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
  SVC: 1.08,
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
  ISK: 150,
  MAD: 10.8,
  TND: 3.4,
  DZD: 145,
  VES: 40,
  CUP: 26,
  TWD: 34.5,
  PKR: 300,
  BDT: 118,
  LKR: 325,
  NPR: 144,
  AFN: 78,
  KZT: 490,
  UZS: 13500,
  GEL: 2.95,
  AMD: 420,
  AZN: 1.85,
  BYN: 3.5,
  MDL: 19.2,
  RSD: 117,
  MKD: 61.5,
  ALL: 104,
  BAM: 1.96,
  XOF: 655.96,
  XAF: 655.96,
  XCD: 2.9,
  JMD: 168,
  TTD: 7.3,
  BBD: 2.16,
  BSD: 1.08,
  JOD: 0.77,
  LBP: 96500,
  IQD: 1410,
  IRR: 45500,
  MVR: 16.6,
  MUR: 49,
  SCR: 14.5,
  ETB: 62,
  TZS: 2750,
  UGX: 4100,
  RWF: 1400,
  MZN: 69,
  AOA: 920,
  NAD: 20.5,
  BWP: 14.6,
  FJD: 2.4,
  PGK: 4.1,
  WST: 2.95,
  TOP: 2.55,
  SBD: 9.1,
  MNT: 3650,
  LAK: 23000,
  KHR: 4400,
  MMK: 2270,
  BND: 1.45,
  MOP: 8.7,
  LSL: 20.5,
  SZL: 20.5,
  MWK: 1870,
  MGA: 4800,
  CDF: 3000,
  GNF: 9300,
  SLL: 24000,
  LRD: 210,
  SLE: 24,
  YER: 270,
  SYP: 14000,
  SDG: 640,
  SSP: 1400,
  LYD: 5.2,
  MRU: 42,
  SOS: 615,
  DJF: 192,
  KMF: 492,
  STN: 24.5,
  CVE: 110.3,
  GMD: 73,
  GIP: 0.86,
  FKP: 0.86,
  SHP: 0.86,
  ANG: 1.95,
  AWG: 1.95,
  SRD: 38,
  GYD: 225,
  BZD: 2.16,
  HTG: 142,
  PAB: 1.08,
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
  SVC: 'Salvadoran Colón',
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
  ISK: 'Icelandic Króna',
  MAD: 'Moroccan Dirham',
  TND: 'Tunisian Dinar',
  DZD: 'Algerian Dinar',
  VES: 'Venezuelan Bolívar',
  CUP: 'Cuban Peso',
  TWD: 'New Taiwan Dollar',
  PKR: 'Pakistani Rupee',
  BDT: 'Bangladeshi Taka',
  LKR: 'Sri Lankan Rupee',
  NPR: 'Nepalese Rupee',
  AFN: 'Afghan Afghani',
  KZT: 'Kazakhstani Tenge',
  UZS: 'Uzbekistani Som',
  GEL: 'Georgian Lari',
  AMD: 'Armenian Dram',
  AZN: 'Azerbaijani Manat',
  BYN: 'Belarusian Ruble',
  MDL: 'Moldovan Leu',
  RSD: 'Serbian Dinar',
  MKD: 'Macedonian Denar',
  ALL: 'Albanian Lek',
  BAM: 'Bosnia-Herzegovina Mark',
  XOF: 'West African CFA Franc',
  XAF: 'Central African CFA Franc',
  XCD: 'East Caribbean Dollar',
  JMD: 'Jamaican Dollar',
  TTD: 'Trinidad Dollar',
  BBD: 'Barbadian Dollar',
  BSD: 'Bahamian Dollar',
  JOD: 'Jordanian Dinar',
  LBP: 'Lebanese Pound',
  IQD: 'Iraqi Dinar',
  IRR: 'Iranian Rial',
  MVR: 'Maldivian Rufiyaa',
  MUR: 'Mauritian Rupee',
  SCR: 'Seychellois Rupee',
  ETB: 'Ethiopian Birr',
  TZS: 'Tanzanian Shilling',
  UGX: 'Ugandan Shilling',
  RWF: 'Rwandan Franc',
  MZN: 'Mozambican Metical',
  AOA: 'Angolan Kwanza',
  NAD: 'Namibian Dollar',
  BWP: 'Botswana Pula',
  FJD: 'Fijian Dollar',
  PGK: 'Papua New Guinean Kina',
  WST: 'Samoan Tala',
  TOP: 'Tongan Paʻanga',
  SBD: 'Solomon Islands Dollar',
  MNT: 'Mongolian Tögrög',
  LAK: 'Lao Kip',
  KHR: 'Cambodian Riel',
  MMK: 'Myanmar Kyat',
  BND: 'Brunei Dollar',
  MOP: 'Macanese Pataca',
  LSL: 'Lesotho Loti',
  SZL: 'Swazi Lilangeni',
  MWK: 'Malawian Kwacha',
  MGA: 'Malagasy Ariary',
  CDF: 'Congolese Franc',
  GNF: 'Guinean Franc',
  SLL: 'Sierra Leonean Leone',
  LRD: 'Liberian Dollar',
  SLE: 'Sierra Leonean Leone',
  YER: 'Yemeni Rial',
  SYP: 'Syrian Pound',
  SDG: 'Sudanese Pound',
  SSP: 'South Sudanese Pound',
  LYD: 'Libyan Dinar',
  MRU: 'Mauritanian Ouguiya',
  SOS: 'Somali Shilling',
  DJF: 'Djiboutian Franc',
  KMF: 'Comorian Franc',
  STN: 'São Tomé Dobra',
  CVE: 'Cape Verdean Escudo',
  GMD: 'Gambian Dalasi',
  GIP: 'Gibraltar Pound',
  FKP: 'Falkland Islands Pound',
  SHP: 'Saint Helena Pound',
  ANG: 'Netherlands Antillean Guilder',
  AWG: 'Aruban Florin',
  SRD: 'Surinamese Dollar',
  GYD: 'Guyanese Dollar',
  BZD: 'Belize Dollar',
  HTG: 'Haitian Gourde',
  PAB: 'Panamanian Balboa',
  SVC: 'Salvadoran Colón',
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
  if (!currency || !(currency in EXCHANGE_RATES)) return null;
  return EXCHANGE_RATES[currency];
}

/**
 * Convertir créditos a moneda local
 * @param {number} credits - Cantidad de créditos
 * @param {string} currency - Moneda de destino
 * @returns {number} - Cantidad en moneda local
 */
export function creditsToCurrency(credits, currency) {
  const rate = getExchangeRate(currency) ?? 1;
  return credits * rate;
}

/**
 * Convertir moneda local a créditos
 * @param {number} amount - Cantidad en moneda local
 * @param {string} currency - Moneda de origen
 * @returns {number} - Cantidad en créditos
 */
export function currencyToCredits(amount, currency) {
  const rate = getExchangeRate(currency) ?? 1;
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
