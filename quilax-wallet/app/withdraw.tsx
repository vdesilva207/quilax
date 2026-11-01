import { useCallback, useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  View,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton } from '@/components/WalletShell';
import { TotpVerifyStep } from '@/components/TotpVerifyStep';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { creditsToFiat } from '@/constants/money';

const MIN_WITHDRAW = 5;

/**
 * Soft-launch withdrawals: user provides IBAN; ops pays by SEPA (no Stripe payout).
 */
export default function WithdrawScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'form' | 'totp'>('form');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const [status, security] = await Promise.all([
        apiFetch('/wallet-access/status'),
        apiFetch('/profile/security').catch(() => null),
      ]);
      if (status?.banRecoveryOnly) {
        router.replace('/recover-balance');
        return;
      }
      setCurrency(status.currency || 'EUR');
      if (status.bankAccount?.accountName) {
        setAccountName(status.bankAccount.accountName);
      }
      setTwoFactorEnabled(!!security?.security?.twoFactorEnabled);
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const value = Math.floor(Number(amount) || 0);
  const formattedValue = creditsToFiat(value, currency);

  const continueToTotp = () => {
    setError('');
    setInfo('');
    if (!Number.isFinite(value) || value < MIN_WITHDRAW) {
      setError(t('withdraw.minWithdraw', { min: MIN_WITHDRAW }));
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
      setError(t('withdraw.need2fa'));
      return;
    }
    setStep('totp');
  };

  const submitWithTotp = async (totpCode: string) => {
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const data = await apiFetch('/withdraws/request-manual', {
        method: 'POST',
        body: JSON.stringify({
          amount: value,
          iban: iban.replace(/\s+/g, ''),
          accountName: accountName.trim(),
          totpCode,
        }),
      });
      setInfo(data?.message || t('withdraw.manualQueued'));
      setStep('form');
      setAmount('');
    } catch (err: any) {
      setError(err?.message || t('errors.withdrawCheckFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <WalletShell showBack title={t('withdraw.title')} subtitle={t('withdraw.loading')}>
        <ActivityIndicator color={Colors.primary} />
      </WalletShell>
    );
  }

  if (step === 'totp') {
    return (
      <WalletShell showBack title={t('withdraw.titleBank')} subtitle={t('withdraw.subtitleTotp')}>
        <TotpVerifyStep
          onSubmit={submitWithTotp}
          submitting={submitting}
          error={error}
          onCancel={() => setStep('form')}
        />
      </WalletShell>
    );
  }

  return (
    <WalletShell
      showBack
      title={t('withdraw.titleBank')}
      subtitle={t('withdraw.manualSubtitle', { min: MIN_WITHDRAW })}
      footer={
        submitting ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <PrimaryButton
            label={
              value >= MIN_WITHDRAW
                ? t('common.continueWithAmount', { amount: formattedValue })
                : t('common.enterAmount')
            }
            onPress={continueToTotp}
            disabled={value < MIN_WITHDRAW}
          />
        )
      }
    >
      <Text style={styles.copy}>{t('withdraw.manualCopy')}</Text>

      <Text style={styles.label}>{t('withdraw.amountLabel')}</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder={String(MIN_WITHDRAW)}
        placeholderTextColor={Colors.light.textSecondary}
      />

      <Text style={styles.label}>{t('withdraw.ibanLabel')}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="characters"
        value={iban}
        onChangeText={setIban}
        placeholder="ES00 ACCT-000003 0000"
        placeholderTextColor={Colors.light.textSecondary}
      />

      <Text style={styles.label}>{t('withdraw.accountNameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={accountName}
        onChangeText={setAccountName}
        placeholder={t('withdraw.accountNamePlaceholder')}
        placeholderTextColor={Colors.light.textSecondary}
      />

      {info ? <Text style={styles.info}>{info}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: Spacing.four }} />
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  label: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundElement,
  },
  info: {
    marginTop: Spacing.three,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  error: {
    marginTop: Spacing.two,
    color: Colors.light.error,
    fontWeight: '600',
  },
});
