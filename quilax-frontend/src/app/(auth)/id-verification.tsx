import React, { useEffect, useRef, useState } from 'react';
import {
  Text,
  StyleSheet,
  Alert,
  View,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import { authFormStyles } from '@/constants/authForm';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
  AuthSecondaryButton,
} from '@/components/ui/AuthFlowLayout';
import {
  RegistrationOnboardingGate,
  useRequireRegistrationOnboarding,
} from '@/hooks/useRequireRegistrationOnboarding';

async function openStripeUrl(url: string): Promise<boolean> {
  if (!url) return false;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (w) return true;
    } catch { /* fall through */ }
    try {
      window.location.href = url;
      return true;
    } catch {
      return false;
    }
  }
  try {
    const can = await Linking.canOpenURL(url);
    if (can === false) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * KYC = Stripe Identity only (document + matching selfie / liveness).
 * No manual photo upload and no in-app face-scan — those do not verify documents.
 */
export default function IdVerificationScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refreshProfile, token: authToken, user } = useAuth() as any;
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'creating' | 'ready' | 'polling'>('idle');
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);
  const pollCancel = useRef(false);

  const canSkipKyc = (() => {
    const email = String(user?.email || '').toLowerCase();
    const allow = (
      process.env.EXPO_PUBLIC_KYC_SKIP_ALLOWLIST ||
      ''
    )
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return allow.includes(email);
  })();

  const gate = useRequireRegistrationOnboarding();

  useEffect(() => {
    return () => {
      pollCancel.current = true;
    };
  }, []);

  const goAfterVerified = async () => {
    await refreshProfile?.({ full: false }).catch(() => null);
    // Tras KYC el siguiente paso del registro es completar provincia/género
    router.replace('/(auth)/complete-profile');
  };

  const skipStripeIdentity = async () => {
    setError(null);
    setSkipping(true);
    try {
      if (!authToken) throw new Error(t('auth.idVerificationScreen.autoNeedLogin'));
      apiClient.setToken(authToken);
      await apiClient.post('/profile/identity/skip', {});
      await goAfterVerified();
    } catch (err: any) {
      setError(err?.message || t('auth.idVerificationScreen.skipFailed'));
    } finally {
      setSkipping(false);
    }
  };

  const startPolling = async () => {
    pollCancel.current = false;
    setPolling(true);
    setPhase('polling');
    for (let i = 0; i < 60; i += 1) {
      if (pollCancel.current) break;
      await new Promise((r) => setTimeout(r, 3000));
      if (pollCancel.current) break;
      const status = await apiClient.get('/profile/identity/status').catch(() => null);
      if (status?.idVerified) {
        setPolling(false);
        setPhase('idle');
        await goAfterVerified();
        return;
      }
    }
    setPolling(false);
    setPhase(stripeUrl ? 'ready' : 'idle');
    Alert.alert(
      t('auth.idVerificationScreen.autoPendingTitle'),
      t('auth.idVerificationScreen.autoPendingBody'),
    );
  };

  const openHostedVerification = async (url: string) => {
    const target = url || stripeUrl;
    if (!target) {
      setError(t('auth.idVerificationScreen.autoUnavailable'));
      return;
    }
    setStripeUrl(target);
    setPhase('ready');
    setError(null);
    const opened = await openStripeUrl(target);
    if (!opened) {
      setError(t('auth.idVerificationScreen.autoOpenFailed'));
      return;
    }
    if (Platform.OS !== 'web') await startPolling();
    else void startPolling();
  };

  const startStripeIdentity = async () => {
    setError(null);
    setBusy(true);
    setPhase('creating');
    setStripeUrl(null);
    try {
      if (!authToken) throw new Error(t('auth.idVerificationScreen.autoNeedLogin'));
      apiClient.setToken(authToken);
      const data = await apiClient.post(
        '/profile/identity/session',
        {
          returnOrigin:
            Platform.OS === 'web' && typeof window !== 'undefined'
              ? window.location.origin
              : undefined,
        },
        { timeoutMs: 45000 },
      );
      if (data.alreadyVerified) {
        await goAfterVerified();
        return;
      }
      if (!data.url) throw new Error(t('auth.idVerificationScreen.autoUnavailable'));
      setStripeUrl(data.url);
      setPhase('ready');
    } catch (err: any) {
      const msg =
        err?.code === 'TIMEOUT'
          ? t('auth.idVerificationScreen.autoTimeout')
          : err?.message || t('auth.idVerificationScreen.autoUnavailable');
      setError(msg);
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  };

  const creating = busy || phase === 'creating';

  return (
    <RegistrationOnboardingGate
      gate={gate}
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      }
    >
    <AuthFlowLayout
      title={t('auth.idVerificationScreen.title')}
      subtitle={t('auth.idVerificationScreen.subtitle')}
      badge={t('common.step', { n: 4 })}
    >
      <AuthProgressDots total={5} current={4} />
      <AuthCard>
        <Text style={authFormStyles.hint}>{t('auth.idVerificationScreen.stripeOnlyHint')}</Text>

        {creating ? (
          <View style={styles.busyBox}>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.polling}>{t('auth.idVerificationScreen.autoCreating')}</Text>
          </View>
        ) : phase === 'ready' && stripeUrl ? (
          <>
            <AuthPrimaryButton
              label={t('auth.idVerificationScreen.autoOpenButton')}
              onPress={() => openHostedVerification(stripeUrl)}
            />
            <Text style={styles.polling}>{t('auth.idVerificationScreen.autoOpenHint')}</Text>
          </>
        ) : (
          <AuthPrimaryButton
            label={t('auth.idVerificationScreen.autoButton')}
            onPress={startStripeIdentity}
          />
        )}

        {polling ? (
          <>
            <Text style={styles.polling}>{t('auth.idVerificationScreen.autoPolling')}</Text>
            <AuthSecondaryButton
              label={t('common.cancel')}
              onPress={() => {
                pollCancel.current = true;
                setPolling(false);
                setPhase(stripeUrl ? 'ready' : 'idle');
              }}
            />
          </>
        ) : null}

        {error ? <Text style={authFormStyles.errorText}>{error}</Text> : null}

        {canSkipKyc && !polling && !creating ? (
          <AuthSecondaryButton
            label={skipping ? t('common.loading') : t('auth.idVerificationScreen.skipForNow')}
            onPress={skipStripeIdentity}
            disabled={skipping || busy}
          />
        ) : null}
      </AuthCard>
    </AuthFlowLayout>
    </RegistrationOnboardingGate>
  );
}

const styles = StyleSheet.create({
  busyBox: { alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.three },
  polling: {
    ...bodyTypeface,
    marginTop: Spacing.two,
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
