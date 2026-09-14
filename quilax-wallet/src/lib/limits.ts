import i18n from '@/i18n';
import { apiFetch } from './api';

export type WalletLimits = {
  maxWithdrawPerTransaction: number;
  maxWithdrawPerMonth: number;
  largePrizeThreshold: number;
};

const DEFAULT_LIMITS: WalletLimits = {
  maxWithdrawPerTransaction: 500,
  maxWithdrawPerMonth: 2000,
  largePrizeThreshold: 100,
};

export async function fetchWalletLimits(): Promise<WalletLimits> {
  try {
    const data = await apiFetch('/wallet-access/limits');
    return {
      maxWithdrawPerTransaction:
        data?.limits?.maxWithdrawPerTransaction ?? DEFAULT_LIMITS.maxWithdrawPerTransaction,
      maxWithdrawPerMonth:
        data?.limits?.maxWithdrawPerMonth ?? DEFAULT_LIMITS.maxWithdrawPerMonth,
      largePrizeThreshold:
        data?.limits?.largePrizeThreshold ?? DEFAULT_LIMITS.largePrizeThreshold,
    };
  } catch {
    return { ...DEFAULT_LIMITS };
  }
}

export function formatLimitsHint(limits: WalletLimits): string {
  return i18n.t('limits.withdrawHint', {
    maxTx: limits.maxWithdrawPerTransaction,
    maxMonth: limits.maxWithdrawPerMonth,
  });
}
