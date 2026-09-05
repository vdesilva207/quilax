import React, { useState, useMemo } from 'react';
import { Text, TextInput, ActivityIndicator } from 'react-native';
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
import BirthDateFields from '@/components/ui/BirthDateFields';

function isPasswordValid(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw);
}

/**
 * Single registration screen: all account fields at once.
 * Nationality is chosen later in onboarding (/(auth)/nationality).
 */
export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordOk = useMemo(() => isPasswordValid(password), [password]);
  const showPasswordHint = passwordTouched && password.length > 0 && !passwordOk;

  const showErr = (msg: string) => {
    setError(msg);
  };

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword || !dateOfBirth.trim()) {
      showErr(t('auth.registerScreen.missingFields'));
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password)) {
      showErr(t('auth.registerScreen.passwordRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      showErr(t('auth.passwordMismatch'));
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth.trim())) {
      showErr(t('auth.registerScreen.dobInvalid'));
      return;
    }
    const [y, m, d] = dateOfBirth.trim().split('-').map(Number);
    const birth = new Date(y, m - 1, d);
    if (Number.isNaN(birth.getTime()) || birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) {
      showErr(t('auth.registerScreen.dobInvalid'));
      return;
    }
    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) {
      showErr(t('auth.registerScreen.mustBe18'));
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });

      if (result.success) {
        const { getOnboardingHref, startRegistrationOnboarding } = await import(
          '@/utils/onboardingGate'
        );
        await startRegistrationOnboarding();
        const href = getOnboardingHref(result.user) || '/(app)';
        router.replace(href as any);
        return;
      }

      const raw = String(result.error || '');
      if (/ya existe|already exists|already registered/i.test(raw)) {
        showErr(t('auth.registerScreen.alreadyExists'));
      } else {
        showErr(raw || t('auth.registerScreen.genericError'));
      }
    } catch (e: any) {
      showErr(e?.message || t('auth.registerScreen.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlowLayout
      title={t('auth.registerScreen.title')}
      subtitle={t('auth.registerScreen.subtitle')}
      showBack
      footer={
        <>
          {loading ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <AuthPrimaryButton label={t('auth.registerScreen.submit')} onPress={handleRegister} />
          )}
          <AuthSecondaryButton
            label={t('auth.registerScreen.haveAccount')}
            onPress={() => router.push('/(auth)/login')}
          />
        </>
      }
    >
      <Text style={styles.label}>{t('auth.registerScreen.fullNameLabel')}</Text>
      <TextInput
        style={styles.input}
        value={fullName}
        onChangeText={setFullName}
        placeholder={t('auth.registerScreen.fullNamePlaceholder')}
        placeholderTextColor={Colors.light.textSecondary}
        autoCapitalize="words"
      />

      <Text style={styles.label}>{t('auth.email')}</Text>
      <TextInput
        testID="email-input"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder={t('common.emailPlaceholder')}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>{t('auth.password')}</Text>
      <PasswordInput
        testID="password-input"
        value={password}
        onChangeText={(text: string) => {
          setPassword(text);
          if (!passwordTouched) setPasswordTouched(true);
          if (error) setError('');
        }}
        placeholder={t('auth.registerScreen.passwordPlaceholder')}
      />
      {showPasswordHint ? (
        <Text style={styles.errorText}>
          {t('auth.registerScreen.passwordRequirements')}
        </Text>
      ) : null}

      <Text style={styles.label}>{t('auth.registerScreen.confirmPasswordLabel')}</Text>
      <PasswordInput
        testID="confirm-password-input"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.registerScreen.confirmPasswordPlaceholder')}
      />

      <Text style={styles.label}>{t('auth.registerScreen.dobLabel')}</Text>
      <Text style={styles.hint}>{t('auth.registerScreen.dobHint')}</Text>
      <BirthDateFields
        value={dateOfBirth}
        onChange={setDateOfBirth}
        dayPlaceholder={t('auth.registerScreen.dobDay')}
        monthPlaceholder={t('auth.registerScreen.dobMonth')}
        yearPlaceholder={t('auth.registerScreen.dobYear')}
      />

      <Text style={styles.note}>{t('auth.registerScreen.webOnlyNote')}</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </AuthFlowLayout>
  );
}
