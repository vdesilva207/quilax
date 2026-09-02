import { Text, ActivityIndicator, Linking } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { authFormStyles } from '@/constants/authForm';
import apiClient from '@/lib/api';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthSecondaryButton,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

/**
 * Optional bank step during signup — opens Stripe Connect onboarding.
 * Does not mark the account verified locally.
 */
export default function AddBankAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goNext = () => router.push('/(auth)/complete-profile');

  const openStripe = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await apiClient.post('/payments/connect/onboard', {});
      if (data?.url) {
        await Linking.openURL(data.url);
      } else {
        setError(t('auth.bankAccountScreen.linkError'));
      }
    } catch (err: any) {
      setError(err?.message || t('auth.bankAccountScreen.openError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFlowLayout
      title={t('auth.bankAccountScreen.title')}
      subtitle={t('auth.bankAccountScreen.subtitle')}
      badge={t('common.optionalLater')}
      showBack
      footer={
        <>
          {busy ? (
            <ActivityIndicator color={Colors.light.primary} />
          ) : (
            <AuthPrimaryButton label={t('auth.bankAccountScreen.verifyWithStripe')} onPress={openStripe} />
          )}
          <AuthSecondaryButton label={t('common.later')} onPress={goNext} />
        </>
      }
    >
      <AuthProgressDots total={5} current={4} />
      <Text style={authFormStyles.note}>{t('auth.bankAccountScreen.copy')}</Text>
      <Text style={authFormStyles.hint}>{t('auth.bankAccountScreen.copySkip')}</Text>
      {error ? <Text style={authFormStyles.errorText}>{error}</Text> : null}
    </AuthFlowLayout>
  );
}
