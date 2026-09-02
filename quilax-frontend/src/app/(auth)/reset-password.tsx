import { Text, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { authFormStyles as styles } from '@/constants/authForm';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
} from '@/components/ui/AuthFlowLayout';
import PasswordInput from '@/components/ui/PasswordInput';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!token || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('auth.resetPasswordScreen.fillAllFields'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password: newPassword });
      Alert.alert(t('common.success'), t('auth.resetPasswordScreen.successBody'));
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('auth.resetPasswordScreen.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFlowLayout
      title={t('auth.resetPasswordScreen.title')}
      subtitle={t('auth.resetPasswordScreen.subtitle')}
      showBack
      footer={
        <AuthPrimaryButton
          label={loading ? t('common.saving') : t('common.save')}
          onPress={handleResetPassword}
          disabled={loading}
        />
      }
    >
      <Text style={styles.label}>{t('auth.resetPasswordScreen.tokenLabel')}</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        placeholder={t('auth.resetPasswordScreen.tokenLabel')}
        placeholderTextColor={Colors.light.textSecondary}
        autoCapitalize="none"
      />
      <Text style={styles.label}>{t('auth.resetPasswordScreen.newPasswordLabel')}</Text>
      <PasswordInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder={t('common.passwordPlaceholder')}
      />
      <Text style={styles.label}>{t('auth.resetPasswordScreen.confirmLabel')}</Text>
      <PasswordInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('common.passwordPlaceholder')}
      />
    </AuthFlowLayout>
  );
}
