import { Text, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { authFormStyles as styles } from '@/constants/authForm';
import { useRouter } from 'expo-router';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/components/ui/AuthFlowLayout';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError(t('auth.forgotPasswordScreen.emailRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post(
        '/auth/forgot-password',
        { email: normalized },
        { timeoutMs: 45000 },
      );
      setSent(true);
    } catch (err: any) {
      const msg =
        err?.payload?.error ||
        err?.message ||
        t('auth.forgotPasswordScreen.sendError');
      setError(msg);
      setSent(false);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthFlowLayout
        title={t('auth.forgotPasswordScreen.emailSentTitle')}
        subtitle={t('auth.forgotPasswordScreen.emailSentBody')}
        showBack
        footer={
          <>
            <AuthPrimaryButton
              label={t('auth.forgotPasswordScreen.enterCode')}
              onPress={() =>
                router.push({
                  pathname: '/(auth)/reset-password',
                  params: { email: email.trim().toLowerCase() },
                })
              }
            />
            <AuthSecondaryButton
              label={t('auth.forgotPasswordScreen.resend')}
              onPress={() => {
                setSent(false);
                setError('');
              }}
            />
          </>
        }
      >
        <Text style={localStyles.hint}>
          {t('auth.forgotPasswordScreen.checkSpam', { email: email.trim().toLowerCase() })}
        </Text>
      </AuthFlowLayout>
    );
  }

  return (
    <AuthFlowLayout
      title={t('auth.forgotPassword')}
      subtitle={t('auth.forgotPasswordScreen.description')}
      showBack
      footer={
        <>
          <AuthPrimaryButton
            label={loading ? t('common.sending') : t('auth.forgotPasswordScreen.sendCode')}
            onPress={handleSubmit}
            disabled={loading}
          />
          <AuthSecondaryButton label={t('common.back')} onPress={() => router.back()} />
        </>
      }
    >
      <Text style={styles.label}>{t('auth.email')}</Text>
      <TextInput
        testID="email-input"
        style={styles.input}
        placeholder={t('auth.email')}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError('');
        }}
      />
      {error ? <Text style={localStyles.error}>{error}</Text> : null}
    </AuthFlowLayout>
  );
}

const localStyles = StyleSheet.create({
  error: {
    color: Colors.light.error,
    fontWeight: '600',
    marginTop: Spacing.two,
    fontSize: 14,
  },
  hint: {
    color: Colors.light.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});
