import { Text, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { authFormStyles as styles } from '@/constants/authForm';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/components/ui/AuthFlowLayout';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ email?: string }>();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleResetPassword = async () => {
    if (!token.trim() || !newPassword || !confirmPassword) {
      setError(t('auth.resetPasswordScreen.fillAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('auth.resetPasswordScreen.minLength'));
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError(t('auth.resetPasswordScreen.needUppercase'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      await apiClient.post(
        '/auth/reset-password',
        { token: token.trim(), newPassword },
        { timeoutMs: 30000 },
      );
      setDone(true);
    } catch (err: any) {
      setError(
        err?.payload?.error ||
          err?.message ||
          t('auth.resetPasswordScreen.genericError'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthFlowLayout
        title={t('common.success')}
        subtitle={t('auth.resetPasswordScreen.successBody')}
        footer={
          <AuthPrimaryButton
            label={t('auth.login')}
            onPress={() => router.replace('/(auth)/login')}
          />
        }
      >
        <Text style={localStyles.hint}>
          {params.email
            ? t('auth.resetPasswordScreen.readyHintWithEmail', { email: params.email })
            : t('auth.resetPasswordScreen.readyHint')}
        </Text>
      </AuthFlowLayout>
    );
  }

  return (
    <AuthFlowLayout
      title={t('auth.resetPasswordScreen.title')}
      subtitle={t('auth.resetPasswordScreen.subtitle')}
      showBack
      footer={
        <>
          <AuthPrimaryButton
            label={loading ? t('common.saving') : t('common.save')}
            onPress={handleResetPassword}
            disabled={loading}
          />
          <AuthSecondaryButton
            label={t('auth.forgotPasswordScreen.sendCode')}
            onPress={() => router.replace('/(auth)/forgot-password')}
          />
        </>
      }
    >
      <Text style={styles.label}>{t('auth.resetPasswordScreen.tokenLabel')}</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={(v) => {
          setToken(v.replace(/\D/g, '').slice(0, 6));
          if (error) setError('');
        }}
        placeholder={t('auth.resetPasswordScreen.tokenPlaceholder')}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="number-pad"
        autoCapitalize="none"
        maxLength={6}
      />
      <Text style={styles.label}>{t('auth.resetPasswordScreen.newPasswordLabel')}</Text>
      <PasswordInput
        value={newPassword}
        onChangeText={(v) => {
          setNewPassword(v);
          if (error) setError('');
        }}
        placeholder={t('common.passwordPlaceholder')}
      />
      <Text style={styles.label}>{t('auth.resetPasswordScreen.confirmLabel')}</Text>
      <PasswordInput
        value={confirmPassword}
        onChangeText={(v) => {
          setConfirmPassword(v);
          if (error) setError('');
        }}
        placeholder={t('common.passwordPlaceholder')}
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
