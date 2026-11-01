import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authFormStyles } from '@/constants/authForm';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';

/**
 * Soft-launch: bank / Stripe Connect step skipped.
 * Credits via IAP; withdrawals via Gestión (manual IBAN) later.
 */
export default function AddBankAccountScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const goNext = () => router.push('/(auth)/complete-profile');

  return (
    <AuthFlowLayout
      title={t('auth.bankAccountScreen.titleSoft')}
      subtitle={t('auth.bankAccountScreen.subtitleSoft')}
      badge={t('common.optionalLater')}
      showBack
      footer={
        <AuthPrimaryButton label={t('common.continue')} onPress={goNext} />
      }
    >
      <AuthProgressDots total={5} current={4} />
      <Text style={authFormStyles.note}>{t('auth.bankAccountScreen.copySoft')}</Text>
      <Text style={authFormStyles.hint}>{t('auth.bankAccountScreen.copySkipSoft')}</Text>
    </AuthFlowLayout>
  );
}
