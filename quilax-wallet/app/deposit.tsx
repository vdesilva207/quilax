import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell, PrimaryButton, SecondaryButton } from '@/components/WalletShell';
import { TotpVerifyStep } from '@/components/TotpVerifyStep';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { apiFetch, getToken } from '@/lib/api';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { formatFiat } from '@/constants/money';

const MIN_CREDITS = 1;

export default function DepositScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'amount' | 'totp' | 'pay' | 'done'>('amount');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [publishableKey, setPublishableKey] = useState('');
  const [quote, setQuote] = useState<{
    chargeMajor: number;
    creditsValueMajor: number;
    processingFeeMajor: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const loadSecurity = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    try {
      const [status, security, config] = await Promise.all([
        apiFetch('/wallet-access/status').catch(() => null),
        apiFetch('/profile/security').catch(() => null),
        apiFetch('/payments/config').catch(() => null),
      ]);
      if (status?.banRecoveryOnly) {
        router.replace('/recover-balance');
        return;
      }
      if (status?.currency) setCurrency(status.currency);
      setTwoFactorEnabled(!!security?.security?.twoFactorEnabled);
      const envKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
      setPublishableKey(config?.publishableKey || envKey);
    } catch (err: any) {
      setError(err?.message || t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  useFocusEffect(
    useCallback(() => {
      void loadSecurity();
    }, [loadSecurity])
  );

  const value = Math.floor(Number(amount) || 0);

  useEffect(() => {
    if (value < MIN_CREDITS) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const data = await apiFetch(`/payments/deposit-quote?credits=${value}`);
        if (cancelled) return;
        const q = data?.quote;
        if (q) {
          setQuote({
            chargeMajor: Number(q.chargeMajor) || 0,
            creditsValueMajor: Number(q.creditsValueMajor) || 0,
            processingFeeMajor: Number(q.processingFeeMajor) || 0,
          });
          if (q.currency) setCurrency(q.currency);
        }
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const chargeMajor = quote?.chargeMajor ?? value;
  const formattedCharge = formatFiat(chargeMajor, currency);
  const formattedCreditsValue = formatFiat(quote?.creditsValueMajor ?? value, currency);
  const formattedFee = formatFiat(quote?.processingFeeMajor ?? 0, currency);

  const continueToTotp = () => {
    setError('');
    if (!Number.isFinite(value) || value < MIN_CREDITS) {
      setError(t('deposit.minCredits', { min: MIN_CREDITS }));
      return;
    }
    if (!twoFactorEnabled) {
      setError(t('deposit.need2fa'));
      return;
    }
    setStep('totp');
  };

  const submitWithTotp = async (totpCode: string) => {
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ credits: value, totpCode }),
      });
      const secret =
        data?.paymentIntent?.clientSecret || data?.paymentIntent?.client_secret;
      const key =
        data?.paymentIntent?.publishableKey ||
        publishableKey ||
        process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        '';
      const pi = data?.paymentIntent;
      if (pi?.amountMajor != null) {
        setQuote({
          chargeMajor: Number(pi.amountMajor) || chargeMajor,
          creditsValueMajor: Number(pi.creditsValueMajor) || value,
          processingFeeMajor: Number(pi.processingFeeMajor) || 0,
        });
      }

      if (!secret) {
        setError(t('errors.paymentSecretMissing'));
        return;
      }
      if (key) setPublishableKey(key);
      setClientSecret(secret);
      setStep('pay');
    } catch (err: any) {
      setError(err?.message || t('errors.paymentStartFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const subtitle =
    step === 'totp'
      ? t('deposit.subtitleTotp')
      : step === 'pay'
        ? t('deposit.subtitlePay')
        : step === 'done'
          ? t('deposit.subtitleDone')
          : t('deposit.subtitleAmount');

  return (
    <WalletShell
      showBack
      title={t('deposit.title')}
      subtitle={subtitle}
      footer={
        step === 'amount' ? (
          submitting || loading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <PrimaryButton
              label={
                value >= MIN_CREDITS
                  ? t('common.continueWithAmount', { amount: formattedCharge })
                  : t('common.enterAmount')
              }
              onPress={continueToTotp}
              disabled={value < MIN_CREDITS || quoteLoading}
            />
          )
        ) : step === 'done' ? (
          <PrimaryButton label={t('deposit.backHome')} onPress={() => router.replace('/')} />
        ) : null
      }
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : step === 'totp' ? (
        <View style={styles.block}>
          <TotpVerifyStep
            title={t('deposit.confirmPayment')}
            hint={t('deposit.confirmPaymentHint', {
              credits: value,
              amount: formattedCharge,
            })}
            submitting={submitting}
            onConfirm={submitWithTotp}
            onCancel={() => {
              setError('');
              setStep('amount');
            }}
            confirmLabel={t('common.continueWithAmount', { amount: formattedCharge })}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : step === 'pay' ? (
        <View style={styles.block}>
          <Text style={styles.paySummary}>
            {t('deposit.paySummary', { credits: value, amount: formattedCharge })}
          </Text>
          <Text style={styles.feeLine}>
            {t('deposit.feeBreakdown', {
              creditsValue: formattedCreditsValue,
              fee: formattedFee,
              total: formattedCharge,
            })}
          </Text>
          <StripePaymentForm
            clientSecret={clientSecret}
            publishableKey={publishableKey}
            onSuccess={() => {
              setError('');
              setStep('done');
            }}
            onError={(msg) => setError(msg)}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <SecondaryButton
            label={t('common.cancel')}
            onPress={() => {
              setClientSecret('');
              setError('');
              setStep('amount');
            }}
          />
        </View>
      ) : step === 'done' ? (
        <View style={styles.block}>
          <Text style={styles.doneTitle}>{t('deposit.paymentConfirmed')}</Text>
          <Text style={styles.doneCopy}>
            {t('deposit.paymentConfirmedBody', { credits: value })}
          </Text>
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.label}>{t('deposit.creditAmount')}</Text>
          <View style={[styles.amountBox, focused && styles.amountBoxFocused]}>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(v) => {
                setError('');
                setAmount(v.replace(/[^\d]/g, ''));
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#C4C4C4"
              autoFocus
              selectionColor={Colors.primary}
            />
            <Text style={styles.unit}>{t('common.credits')}</Text>
          </View>
          {value > 0 ? (
            <>
              <Text style={styles.fiat}>
                {quoteLoading
                  ? t('deposit.calculating')
                  : t('deposit.youPay', { amount: formattedCharge })}
              </Text>
              {quote && !quoteLoading ? (
                <Text style={styles.feeLine}>
                  {t('deposit.feeBreakdown', {
                    creditsValue: formattedCreditsValue,
                    fee: formattedFee,
                    total: formattedCharge,
                  })}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.fiatPlaceholder}>
              {t('deposit.fiatHint', { currency })}
            </Text>
          )}
          <Text style={styles.quizHint}>
            {t('deposit.quizHint', { currency })}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
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
  block: { gap: Spacing.sm },
  label: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'rgba(28,25,23,0.12)',
    borderRadius: 14,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 88,
  },
  amountBoxFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F8FBFF',
  },
  input: {
    flex: 1,
    fontSize: 40,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Fonts.display,
    padding: 0,
    margin: 0,
    outlineStyle: 'none' as any,
  },
  unit: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    paddingBottom: 6,
  },
  fiat: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 2,
    marginLeft: Spacing.md,
  },
  fiatPlaceholder: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginLeft: Spacing.md,
  },
  feeLine: {
    fontFamily: Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
  },
  quizHint: {
    fontFamily: Fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginLeft: Spacing.md,
  },
  paySummary: {
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  doneTitle: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  doneCopy: {
    fontFamily: Fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#B91C1C',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
