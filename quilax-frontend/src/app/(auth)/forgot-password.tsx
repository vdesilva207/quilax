import { Text, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
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

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert(t('common.error'), t('auth.forgotPasswordScreen.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      Alert.alert(t('auth.forgotPasswordScreen.emailSentTitle'), t('auth.forgotPasswordScreen.emailSentBody'));
      router.push('/(auth)/reset-password');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.forgotPasswordScreen.sendError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlowLayout
      title={t('auth.forgotPassword')}
      subtitle={t('auth.forgotPasswordScreen.description')}
      showBack
      footer={
        <>
          <AuthPrimaryButton
            label={loading ? t('common.sending') : t('auth.resetPassword')}
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
        value={email}
        onChangeText={setEmail}
      />
    </AuthFlowLayout>
  );
}
