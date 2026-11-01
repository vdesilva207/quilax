import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton } from '@/components/WalletShell';
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
  bankAccount?: { accountName?: string | null };
};

/**
 * Soft-launch: banned CONTENT accounts recover balance via manual SEPA (IBAN on form).
 * No Stripe Connect.
 */
export default function RecoverBalanceScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');
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
        bankAccount: statusData.bankAccount,
      });
      if (statusData.bankAccount?.accountName) {
        setAccountName(statusData.bankAccount.accountName);
      }
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
    void load();
  }, [load]);

  const canWithdraw = status?.eligibility?.canWithdraw !== false;
  const balance = status?.balance ?? 0;

  const startWithdraw = () => {
    setError('');
    if (balance <= 0) {
      setError(t('recover.noBalance'));
      return;
    }
    if (!canWithdraw) {
      setError(t('recover.cannotWithdraw'));
      return;
    }
    const cleanIban = iban.replace(/\s+/g, '');
    if (cleanIban.length < 15) {
      setError(t('withdraw.needIban'));
      return;
    }
    if (!accountName.trim()) {
      setError(t('withdraw.needAccountName'));
      return;
    }
    if (!twoFactorEnabled) {
      setError(t('recover.need2fa'));
      return;
    }
    setStep('totp');
  };

  const doWithdraw = async (totpCode: string) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/withdraws/request-manual', {
        method: 'POST',
        body: JSON.stringify({
          amount: balance,
          iban: iban.replace(/\s+/g, ''),
          accountName: accountName.trim(),
          totpCode,
        }),
      });
      setDoneMsg(data?.message || t('recover.doneManual'));
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

      <Text style={styles.hint}>{t('recover.manualHint')}</Text>

      <Text style={styles.label}>{t('withdraw.ibanLabel')}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="characters"
        value={iban}
        onChangeText={setIban}
        placeholder="ES00 ACCT-000003 0000"
        placeholderTextColor={Colors.textSecondary}
      />

      <Text style={styles.label}>{t('withdraw.accountNameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={accountName}
        onChangeText={setAccountName}
        placeholder={t('withdraw.accountNamePlaceholder')}
        placeholderTextColor={Colors.textSecondary}
      />

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
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bannerMsg: {
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  until: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  balanceBlock: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  balanceFiat: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  hint: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.body,
    fontWeight: '600',
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  done: {
    marginTop: Spacing.md,
    color: Colors.primary,
    fontWeight: '700',
  },
  error: {
    marginTop: Spacing.sm,
    color: Colors.error,
    fontWeight: '700',
  },
  logout: { marginTop: Spacing.lg, alignItems: 'center' },
  logoutText: {
    fontFamily: Fonts.body,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: Spacing.md,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
