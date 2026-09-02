import React, { useState } from 'react';
import { Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { authFormStyles as styles } from '@/constants/authForm';
import { useAuth } from '@/context/AuthContext';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
} from '@/components/ui/AuthFlowLayout';
import PasswordInput from '@/components/ui/PasswordInput';

/** Login: email + password only (2FA is for Gestión, not app login). */
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError(t('auth.loginScreen.missingFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.error || t('auth.loginScreen.invalidCredentials'));
        return;
      }
      const { getOnboardingHref } = await import('@/utils/onboardingGate');
      // Prefer user from login (already refreshed inside AuthContext); never block navigation.
      const href = getOnboardingHref(result.user) || '/(app)';
      router.replace(href as any);
    } catch (e: any) {
      setError(e?.message || t('auth.loginScreen.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlowLayout
      title={t('auth.login')}
      subtitle={t('auth.loginScreen.subtitle')}
      showBack
      footer={
        <>
          {loading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <AuthPrimaryButton label={t('auth.loginScreen.submit')} onPress={handleLogin} />
          )}
          <AuthSecondaryButton
            label={t('auth.loginScreen.createAccount')}
            onPress={() => router.push('/(auth)/onboarding')}
          />
        </>
      }
    >
      <Text style={styles.label}>{t('auth.email')}</Text>
      <TextInput
        testID="email-input"
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={t('common.emailPlaceholder')}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError('');
        }}
      />
      <Text style={styles.label}>{t('auth.password')}</Text>
      <PasswordInput
        testID="password-input"
        placeholder={t('common.passwordPlaceholder')}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (error) setError('');
        }}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable testID="forgot-password-button" onPress={() => router.push('/(auth)/forgot-password')}>
        <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
      </Pressable>
    </AuthFlowLayout>
  );
}
