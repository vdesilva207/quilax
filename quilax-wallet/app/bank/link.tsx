import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell } from '@/components/WalletShell';
import { Colors } from '@/constants/theme';

/** Legacy route: redirect to Connect onboarding. */
export default function BankLinkRedirect() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    router.replace('/bank');
  }, [router]);

  return (
    <WalletShell showBack title={t('bank.legacyTitle')} subtitle={t('common.redirecting')}>
      <ActivityIndicator color={Colors.primary} />
    </WalletShell>
  );
}
