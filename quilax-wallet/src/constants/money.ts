import type { TFunction } from 'i18next';
import { appLanguageToLocale } from '@/i18n';

/** 1 crédito ≈ 1 unidad de la moneda de cuenta (EUR por defecto). */
export const CREDIT_TO_FIAT = 1;

export function formatFiat(amount: number, currency = 'EUR', locale?: string) {
  const loc = locale || appLanguageToLocale();
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || 'EUR'}`;
  }
}

export function creditsToFiat(credits: number, currency = 'EUR', locale?: string) {
  return formatFiat(credits * CREDIT_TO_FIAT, currency, locale);
}

export function formatDateTime(date: string | Date, locale?: string) {
  const loc = locale || appLanguageToLocale();
  return new Date(date).toLocaleString(loc);
}

export function getBankStatusLabel(status: string | undefined, t: TFunction): string {
  switch (status) {
    case 'VERIFIED':
      return t('bankStatus.verified');
    case 'PENDING':
      return t('bankStatus.pending');
    case 'RESTRICTED':
      return t('bankStatus.restricted');
    default:
      return t('bankStatus.unverified');
  }
}

export function getBankStatusLabelDetailed(status: string | undefined, t: TFunction): string {
  switch (status) {
    case 'VERIFIED':
      return t('bankStatus.verified');
    case 'PENDING':
      return t('bankStatus.pendingStripe');
    case 'RESTRICTED':
      return t('bankStatus.restrictedReview');
    default:
      return t('bankStatus.unverified');
  }
}

export function getTxLabel(type: string, t: TFunction, fallback?: string): string {
  const key = `transactions.types.${type}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return fallback || type;
}

/** @deprecated Use getTxLabel(type, t) instead */
export const TX_LABELS: Record<string, string> = {};
