import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
} from '@/components/ui/AuthFlowLayout';

/**
 * Stripe Identity return_url lands here after hosted verification.
 */
export default function IdentityReturnScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refreshProfile } = useAuth() as any;
  const [status, setStatus] = useState<'checking' | 'ok' | 'pending' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Give Stripe a moment to finalize; then poll a few times.
        for (let i = 0; i < 15; i += 1) {
          if (cancelled) return;
          const res = await apiClient.get('/profile/identity/status').catch(() => null);
          if (res?.idVerified) {
            await refreshProfile?.().catch(() => null);
            if (!cancelled) {
              setStatus('ok');
              router.replace('/(auth)/complete-profile');
            }
            return;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!cancelled) {
          setStatus('pending');
          setMessage(t('auth.idVerificationScreen.autoPendingBody'));
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage(t('auth.idVerificationScreen.autoUnavailable'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile, router, t]);

  return (
    <AuthFlowLayout
      title={t('auth.idVerificationScreen.title')}
      subtitle={t('auth.idVerificationScreen.autoReturnSubtitle')}
    >
      <AuthCard>
        {status === 'checking' ? (
          <>
            <ActivityIndicator color={Colors.light.primary} />
            <Text style={styles.msg}>{t('auth.idVerificationScreen.autoPolling')}</Text>
          </>
        ) : (
          <>
            <Text style={styles.msg}>{message}</Text>
            <AuthPrimaryButton
              label={t('auth.idVerificationScreen.autoReturnContinue')}
              onPress={() => router.replace('/(auth)/id-verification')}
            />
          </>
        )}
      </AuthCard>
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  msg: {
    ...bodyTypeface,
    marginTop: Spacing.three,
    marginBottom: Spacing.three,
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
