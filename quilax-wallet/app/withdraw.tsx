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
import { WalletShell, PrimaryButton, SecondaryButton } from '@/components/WalletShell';
import { TotpVerifyStep } from '@/components/TotpVerifyStep';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { creditsToFiat, getBankStatusLabel } from '@/constants/money';

const MIN_WITHDRAW = 5;

export default function WithdrawScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [ibanMasked, setIbanMasked] = useState<string | null>(null);
  const [bankStatus, setBankStatus] = useState<string>('NONE');
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'amount' | 'totp'>('amount');
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
      const [status, security, connect] = await Promise.all([
        apiFetch('/wallet-access/status'),
        apiFetch('/profile/security').catch(() => null),
        apiFetch('/payments/connect/status').catch(() => null),
      ]);
      setCurrency(status.currency || 'EUR');
      setIbanMasked(
        status.bankAccount?.ibanMasked ||
          (connect?.bankLast4 ? `····${connect.bankLast4}` : null)
      );
      setBankStatus(
        connect?.bankVerificationStatus ||
          status.verification?.bankVerificationStatus ||
          'NONE'
      );
      setCanWithdraw(
        !!connect?.canWithdraw ||
          (status.eligibility?.canWithdraw === true &&
            status.verification?.bankVerificationStatus === 'VERIFIED')
      );
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
    }, [load])
  );

  const value = Math.floor(Number(amount) || 0);
  const formattedValue = creditsToFiat(value, currency);

  const continueToTotp = () => {
    setError('');
    setInfo('');
    if (!canWithdraw || bankStatus !== 'VERIFIED') {
      setError(t('withdraw.needBankVerification'));
      return;
    }
    if (!Number.isFinite(value) || value < MIN_WITHDRAW) {
      setError(t('withdraw.minWithdraw', { min: MIN_WITHDRAW }));
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
      const data = await apiFetch('/withdraws/request', {
        method: 'POST',
        body: JSON.stringify({ amount: value, totpCode }),
      });
      setStep('amount');
      setAmount('');
      if (data?.pendingReview || data?.withdraw?.status === 'PENDING_REVIEW') {
        setInfo(data?.estimatedTime || t('withdraw.pendingReview'));
        return;
      }
      router.replace('/');
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

  if (!canWithdraw || bankStatus !== 'VERIFIED') {
    const statusLabel = getBankStatusLabel(
      bankStatus === 'PENDING' ? 'PENDING' : undefined,
      t
    );
    return (
      <WalletShell
        showBack
        title={t('withdraw.titleBank')}
        subtitle={t('withdraw.verificationRequired')}
        footer={
          <PrimaryButton
            label={t('withdraw.verifyWithStripe')}
            onPress={() => router.replace('/bank')}
          />
        }
      >
        <Text style={styles.copy}>{t('withdraw.verificationCopy')}</Text>
        <Text style={styles.meta}>
          {t('common.currentStatus', { status: statusLabel })}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </WalletShell>
    );
  }

  const subtitle =
    step === 'totp'
      ? t('withdraw.subtitleTotp')
      : ibanMasked
        ? t('common.destination', { iban: ibanMasked, min: MIN_WITHDRAW })
        : t('common.minimumCredits', { min: MIN_WITHDRAW });

  return (
    <WalletShell
      showBack
      title={t('withdraw.titleBank')}
      subtitle={subtitle}
      footer={
        step === 'amount' ? (
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
        ) : null
      }
    >
      {step === 'totp' ? (
        <View>
          <TotpVerifyStep
            title={t('withdraw.confirmWithdraw')}
            hint={t('withdraw.confirmWithdrawHint', {
              credits: value,
              amount: formattedValue,
            })}
            submitting={submitting}
            onConfirm={submitWithTotp}
            onCancel={() => {
              setError('');
              setStep('amount');
            }}
            confirmLabel={t('withdraw.withdrawAmount', { amount: formattedValue })}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : (
        <View>
          <Text style={styles.label}>{t('withdraw.amountLabel')}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={(v) => {
              setError('');
              setAmount(v.replace(/[^\d]/g, ''));
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.textSecondary}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}
          {!twoFactorEnabled ? (
            <SecondaryButton
              label={t('common.configure2fa')}
              onPress={() => router.push('/security/2fa')}
            />
          ) : null}
        </View>
      )}
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  meta: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.display,
    marginBottom: Spacing.sm,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#B91C1C',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  info: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.success,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
