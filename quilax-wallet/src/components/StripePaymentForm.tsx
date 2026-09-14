import { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void;
  onError: (message: string) => void;
};

let stripePromiseCache: Promise<Stripe | null> | null = null;
let cachedKey: string | null = null;

function getStripe(publishableKey: string) {
  if (cachedKey !== publishableKey) {
    cachedKey = publishableKey;
    stripePromiseCache = loadStripe(publishableKey);
  }
  return stripePromiseCache!;
}

function CheckoutForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setLocalError('');
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url:
            typeof window !== 'undefined'
              ? `${window.location.origin}/deposit?paid=1`
              : undefined,
        },
      });

      if (error) {
        const msg = error.message || t('stripe.paymentFailed');
        setLocalError(msg);
        onError(msg);
        return;
      }

      if (
        paymentIntent?.status === 'succeeded' ||
        paymentIntent?.status === 'processing'
      ) {
        onSuccess();
      } else {
        const msg = t('stripe.paymentStatus', {
          status: paymentIntent?.status || t('stripe.unknownStatus'),
        });
        setLocalError(msg);
        onError(msg);
      }
    } catch (e: any) {
      const msg = e?.message || t('stripe.confirmError');
      setLocalError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.form}>
      <View style={styles.elementWrap}>
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </View>
      {localError ? <Text style={styles.error}>{localError}</Text> : null}
      <Pressable
        style={[styles.payBtn, (!stripe || submitting) && styles.payBtnDisabled]}
        onPress={pay}
        disabled={!stripe || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>{t('stripe.payNow')}</Text>
        )}
      </Pressable>
    </View>
  );
}

/**
 * Stripe Payment Element — web only (Gestión).
 * Native platforms should open Gestión web for card deposits.
 */
export function StripePaymentForm({
  clientSecret,
  publishableKey,
  onSuccess,
  onError,
}: Props) {
  const { t } = useTranslation();

  if (Platform.OS !== 'web') {
    return (
      <Text style={styles.error}>
        {t('stripe.webOnly')}
      </Text>
    );
  }

  if (!publishableKey || !clientSecret) {
    return (
      <Text style={styles.error}>
        {t('stripe.configMissing')}
      </Text>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: Colors.primary,
        borderRadius: '10px',
        fontFamily: Fonts.body,
      },
    },
  };

  return (
    <Elements stripe={getStripe(publishableKey)} options={options}>
      <CheckoutForm onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md, width: '100%' },
  elementWrap: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceMuted,
    minHeight: 120,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnDisabled: { opacity: 0.55 },
  payBtnText: {
    color: '#fff',
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '700',
  },
  error: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
  },
});

export default StripePaymentForm;
