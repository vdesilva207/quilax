import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton, SecondaryButton } from '@/components/WalletShell';
import { TotpVerifyStep } from '@/components/TotpVerifyStep';
import { apiFetch, getToken, logoutSession, clearToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { creditsToFiat, formatDateTime } from '@/constants/money';
import { hasRecoverySessionFlag } from '@/components/SessionBootstrap';

type Status = {
  balance: number;
  currency: string;
  banRecoveryOnly?: boolean;
  ban?: {
    category?: string | null;
    message?: string | null;
    until?: string | null;
    canRecoverBalance?: boolean;
  } | null;
  eligibility?: { canWithdraw?: boolean; reasons?: string[] };
  verification?: {
    hasConnectAccount?: boolean;
    bankVerificationStatus?: string;
    isBankVerified?: boolean;
  };
};

/**
 * Pantalla exclusiva para cuentas suspendidas por contenido (CONTENT):
 * muestra mensaje de ban + saldo y permite retirar el total restante.
 */
export default function RecoverBalanceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [step, setStep] = useState<'info' | 'totp'>('info');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [doneMsg, setDoneMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      const [statusData, security] = await Promise.all([
        apiFetch('/wallet-access/status'),
        apiFetch('/profile/security').catch(() => null),
      ]);

      if (!statusData.banRecoveryOnly) {
        router.replace('/');
        return;
      }

      setStatus({
        balance: statusData.balance ?? 0,
        currency: statusData.currency || 'EUR',
        banRecoveryOnly: true,
        ban: statusData.ban,
        eligibility: statusData.eligibility,
        verification: statusData.verification,
      });
      setTwoFactorEnabled(!!security?.security?.twoFactorEnabled);
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
      if (err?.status === 401 || err?.status === 403) {
        await clearToken();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    load();
  }, [load]);

  const hasConnect =
    !!status?.verification?.hasConnectAccount ||
    status?.verification?.bankVerificationStatus === 'VERIFIED';
  const canWithdraw = status?.eligibility?.canWithdraw === true;
  const balance = status?.balance ?? 0;

  const startWithdraw = () => {
    setError('');
    if (balance <= 0) {
      setError(t('recover.noBalance'));
      return;
    }
    if (!hasConnect || !canWithdraw) {
      setError(t('recover.noConnect'));
      return;
    }
    if (twoFactorEnabled) {
      setStep('totp');
      return;
    }
    void doWithdraw('');
  };

  const doWithdraw = async (totpCode: string) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/withdraws/request', {
        method: 'POST',
        body: JSON.stringify({
          amount: balance,
          totpCode: totpCode || undefined,
        }),
      });
      setDoneMsg(
        data?.pendingReview ? t('recover.donePending') : t('recover.doneSuccess')
      );
      setStep('info');
      await load();
    } catch (err: any) {
      setError(err?.message || t('errors.withdrawRequestFailed'));
      setStep('info');
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await logoutSession().catch(() => clearToken());
    router.replace('/login');
  };

  if (loading) {
    return (
      <WalletShell brand title={t('recover.title')} subtitle={t('recover.loading')}>
        <ActivityIndicator color={Colors.primary} />
      </WalletShell>
    );
  }

  if (step === 'totp') {
    return (
      <WalletShell brand title={t('recover.confirmTitle')} subtitle={t('recover.confirmSubtitle')}>
        <TotpVerifyStep
          title={t('recover.confirmWithdrawTitle')}
          hint={t('recover.confirmWithdrawHint')}
          submitting={submitting}
          confirmLabel={t('recover.withdrawCredits', { balance })}
          onConfirm={(code) => void doWithdraw(code)}
          onCancel={() => setStep('info')}
        />
      </WalletShell>
    );
  }

  const fiat = creditsToFiat(balance, status?.currency || 'EUR');

  return (
    <WalletShell
      brand
      title={t('recover.accountSuspended')}
      subtitle={t('recover.subtitle')}
    >
      <View style={styles.banner}>
        <Text style={styles.bannerKicker}>{t('recover.suspension')}</Text>
        <Text style={styles.bannerMsg}>
          {status?.ban?.message || t('recover.defaultBanMessage')}
        </Text>
        {status?.ban?.until ? (
          <Text style={styles.until}>
            {t('common.until', { date: formatDateTime(status.ban.until) })}
          </Text>
        ) : (
          <Text style={styles.until}>{t('common.permanent')}</Text>
        )}
      </View>

      <View style={styles.balanceBlock}>
        <Text style={styles.balanceLabel}>{t('recover.remainingBalance')}</Text>
        <Text style={styles.balanceValue}>{t('recover.creditsValue', { balance })}</Text>
        <Text style={styles.balanceFiat}>{fiat}</Text>
      </View>

      {!hasConnect || !canWithdraw ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>{t('recover.noBankTitle')}</Text>
          <Text style={styles.warnBody}>{t('recover.noBankBody')}</Text>
          {status?.eligibility?.reasons?.length ? (
            <Text style={styles.warnBody}>{status.eligibility.reasons.join(' · ')}</Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.hint}>{t('recover.canWithdrawHint')}</Text>
      )}

      {doneMsg ? <Text style={styles.done}>{doneMsg}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={
          submitting
            ? t('common.processing')
            : balance > 0
              ? t('recover.withdrawCredits', { balance })
              : t('recover.noBalanceBtn')
        }
        onPress={startWithdraw}
        disabled={submitting || balance <= 0 || !canWithdraw}
      />

      {hasConnect && !canWithdraw ? (
        <SecondaryButton label={t('recover.linkBank')} onPress={() => router.push('/bank')} />
      ) : null}

      <Pressable onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </Pressable>

      {!hasRecoverySessionFlag() ? null : (
        <Text style={styles.footerNote}>{t('recover.sessionNote')}</Text>
      )}
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  bannerKicker: {
    fontFamily: Fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: Colors.error,
  },
  bannerMsg: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  until: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceBlock: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: 4,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  balanceValue: {
    fontFamily: Fonts.display,
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
  },
  balanceFiat: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  warn: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 14,
    padding: Spacing.md,
    gap: 6,
  },
  warnTitle: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  warnBody: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  done: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.success,
    lineHeight: 20,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.error,
    lineHeight: 20,
  },
  logout: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  logoutText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerNote: {
    textAlign: 'center',
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
