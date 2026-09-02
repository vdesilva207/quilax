import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import { getOnboardingHref } from '@/utils/onboardingGate';

export default function Index() {
  const { loading, isAuthenticated, user } = useAuth();
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.light.background,
          gap: Spacing.three,
          paddingHorizontal: Spacing.four,
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={{ color: Colors.light.textSecondary, fontSize: 15, textAlign: 'center' }}>
          {slow ? t('common.stillLoading') : t('common.loadingQuilax')}
        </Text>
      </View>
    );
  }

  if (isAuthenticated) {
    const onboardingHref = getOnboardingHref(user);
    if (onboardingHref) {
      return <Redirect href={onboardingHref as any} />;
    }
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
