import { Text, StyleSheet, TextInput, Pressable, View, ActivityIndicator } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, bodyTypeface, titleTypeface } from '@/constants/theme';
import { authFormStyles } from '@/constants/authForm';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { isDevSkipOnboarding } from '@/utils/onboardingGate';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
} from '@/components/ui/AuthFlowLayout';

const RESEND_COOLDOWN_SEC = 30;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, token: authToken, refreshProfile } = useAuth() as any;
  const skipOnboarding = isDevSkipOnboarding();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<{ type: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailDelivered, setEmailDelivered] = useState<boolean | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const autoSent = useRef(false);

  // Ya verificado: si sigue el registro → siguiente paso; si no → app
  useEffect(() => {
    if (!user?.emailVerified) return;
    let cancelled = false;
    (async () => {
      const {
        isRegistrationOnboardingActive,
        getOnboardingHref,
      } = await import('@/utils/onboardingGate');
      const active = await isRegistrationOnboardingActive();
      if (cancelled) return;
      if (active) {
        const href = getOnboardingHref(user) || '/(auth)/currency-selection';
        if (href !== '/(auth)/verify-email') {
          router.replace(href as any);
        }
        return;
      }
      router.replace('/(app)');
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.emailVerified, user, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const startCooldown = (seconds = RESEND_COOLDOWN_SEC) => {
    setCooldown(Math.max(0, seconds));
  };

  const handleResend = useCallback(
    async (silent = false) => {
      if (resending) return;
      if (!authToken) {
        setStatus({
          type: 'err',
          text: t('auth.verifyEmailScreen.resendError'),
        });
        return;
      }
      // Always sync — Metro HMR can wipe apiClient.token while React still has authToken.
      apiClient.setToken(authToken);

      if (cooldown > 0 && !silent) {
        setStatus({
          type: 'info',
          text: t('auth.verifyEmailScreen.cooldownWait', { n: cooldown }),
        });
        return;
      }

      setResending(true);
      setCodeError(null);
      if (!silent) {
        setStatus({ type: 'info', text: t('auth.verifyEmailScreen.sending') });
      }

      try {
        const data = await apiClient.post(
          '/auth/send-verification-email',
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            timeoutMs: 25000,
          }
        );
        if (data?.alreadyVerified) {
          await refreshProfile?.({ full: false }).catch(() => null);
          router.replace('/(app)');
          return;
        }
        if (data?.verificationCode) {
          setDevCode(String(data.verificationCode));
        }
        if (typeof data?.delivered === 'boolean') {
          setEmailDelivered(data.delivered);
        }

        const wait = Number(data?.retryAfterSeconds) || RESEND_COOLDOWN_SEC;
        startCooldown(wait);

        if (data?.delivered === false) {
          setStatus({
            type: 'err',
            text: data?.verificationCode
              ? t('auth.verifyEmailScreen.devBody', { code: data.verificationCode })
              : t('auth.verifyEmailScreen.resendError'),
          });
        } else {
          setStatus({
            type: 'ok',
            text: t('auth.verifyEmailScreen.resendOkTo', {
              email: user?.email || t('auth.verifyEmailScreen.fallbackEmail'),
            }),
          });
        }
      } catch (error: any) {
        if (error?.code === 'RESEND_COOLDOWN' || error?.status === 429) {
          const wait = Number(error?.payload?.retryAfterSeconds) || RESEND_COOLDOWN_SEC;
          startCooldown(wait);
          setStatus({
            type: silent ? 'ok' : 'info',
            text: silent
              ? t('auth.verifyEmailScreen.resendOkTo', {
                  email: user?.email || t('auth.verifyEmailScreen.fallbackEmail'),
                })
              : t('auth.verifyEmailScreen.cooldownWait', { n: wait }),
          });
        } else if (!silent) {
          setStatus({
            type: 'err',
            text: error?.message || t('auth.verifyEmailScreen.resendError'),
          });
        }
      } finally {
        setResending(false);
      }
    },
    [cooldown, resending, t, user, authToken, refreshProfile, router]
  );

  // Register already sends the verification email — don't auto-resend on mount
  // (that generated a NEW code and made the first email's code invalid).
  useEffect(() => {
    if (skipOnboarding) return;
    if (autoSent.current) return;
    if (!authToken) return;
    autoSent.current = true;
    // Mark that an email should already be on the way from register.
    setStatus({
      type: 'ok',
      text: t('auth.verifyEmailScreen.resendOkTo', {
        email: user?.email || t('auth.verifyEmailScreen.fallbackEmail'),
      }),
    });
    startCooldown(RESEND_COOLDOWN_SEC);
  }, [authToken, skipOnboarding, t, user?.email]);

  const handleVerify = async () => {
    const code = token.trim();
    setCodeError(null);
    if (!code) {
      setCodeError(t('auth.verifyEmailScreen.codeRequiredBody'));
      return;
    }
    if (!authToken) {
      setCodeError(t('auth.verifyEmailScreen.verifyFailedBody'));
      return;
    }
    apiClient.setToken(authToken);

    setLoading(true);
    try {
      await apiClient.post(
        '/auth/verify-email',
        { token: code },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      await refreshProfile?.().catch(() => null);
      router.replace('/(auth)/currency-selection');
    } catch (error: any) {
      const msg =
        error?.code === 'INVALID_CODE' ||
        /no es correcto|inválido|invalid/i.test(String(error?.message || ''))
          ? t('auth.verifyEmailScreen.wrongCode')
          : error?.message || t('auth.verifyEmailScreen.verifyFailedBody');
      setCodeError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendDisabled = resending || cooldown > 0;
  const resendLabel = resending
    ? t('auth.verifyEmailScreen.sending')
    : cooldown > 0
      ? t('auth.verifyEmailScreen.resendIn', { n: cooldown })
      : t('auth.verifyEmailScreen.resend');

  if (skipOnboarding) {
    return <Redirect href="/(app)" />;
  }

  return (
    <AuthFlowLayout
      title={t('auth.verifyEmailScreen.title')}
      subtitle={t('auth.verifyEmailScreen.subtitle')}
      footer={
        <AuthPrimaryButton
          label={loading ? t('common.verifying') : t('common.continue')}
          onPress={handleVerify}
          disabled={loading || resending}
        />
      }
    >
      <AuthCard>
        <Text style={styles.text}>
          {t('auth.verifyEmailScreen.description', {
            email: user?.email || t('auth.verifyEmailScreen.fallbackEmail'),
          })}
        </Text>

        {status ? (
          <View
            style={[
              styles.statusBox,
              status.type === 'ok' && styles.statusOk,
              status.type === 'err' && styles.statusErr,
              status.type === 'info' && styles.statusInfo,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                status.type === 'ok' && styles.statusTextOk,
                status.type === 'err' && styles.statusTextErr,
              ]}
            >
              {status.text}
            </Text>
          </View>
        ) : null}

        {emailDelivered === false && devCode ? (
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>{t('auth.verifyEmailScreen.devTitle')}</Text>
            <Text style={styles.devBody}>{t('auth.verifyEmailScreen.devHint')}</Text>
            <Text style={styles.devCode}>{devCode}</Text>
          </View>
        ) : null}

        <TextInput
          style={[styles.input, codeError ? authFormStyles.inputError : null]}
          value={token}
          onChangeText={(v) => {
            setToken(v);
            if (codeError) setCodeError(null);
          }}
          placeholder={t('auth.verifyEmailScreen.codePlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="number-pad"
          autoCapitalize="none"
          maxLength={8}
          testID="verify-email-code"
        />
        {codeError ? <Text style={authFormStyles.errorText}>{codeError}</Text> : null}

        <Pressable
          onPress={() => void handleResend(false)}
          disabled={resendDisabled}
          style={({ pressed }) => [
            styles.resendBtn,
            resendDisabled && styles.resendBtnDisabled,
            pressed && !resendDisabled && styles.resendBtnPressed,
          ]}
          testID="resend-verification-code"
        >
          {resending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.resendBtnText, resendDisabled && styles.resendBtnTextDisabled]}>
              {resendLabel}
            </Text>
          )}
        </Pressable>
        {cooldown > 0 ? (
          <Text style={styles.cooldownHint}>
            {t('auth.verifyEmailScreen.cooldownHint', { n: cooldown })}
          </Text>
        ) : null}
      </AuthCard>
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  text: {
    ...bodyTypeface,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 22,
    marginBottom: Spacing.three,
    fontWeight: '500',
  },
  input: {
    ...bodyTypeface,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  statusBox: {
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: 'rgba(22,163,74,0.1)',
    borderColor: 'rgba(22,163,74,0.35)',
  },
  statusErr: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  statusInfo: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  statusText: {
    ...bodyTypeface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Colors.light.text,
    textAlign: 'center',
  },
  statusTextOk: { color: '#15803D' },
  statusTextErr: { color: Colors.light.error },
  resendBtn: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  resendBtnPressed: { opacity: 0.85 },
  resendBtnDisabled: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  resendBtnText: {
    ...titleTypeface,
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  resendBtnTextDisabled: {
    color: Colors.light.textSecondary,
  },
  cooldownHint: {
    ...bodyTypeface,
    marginTop: Spacing.two,
    textAlign: 'center',
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  devBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(234,88,12,0.25)',
  },
  devTitle: {
    ...titleTypeface,
    fontWeight: '700',
    color: Colors.light.text,
    fontSize: 14,
  },
  devBody: {
    ...bodyTypeface,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  devCode: {
    ...titleTypeface,
    marginTop: 4,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    color: Colors.light.primary,
  },
});
