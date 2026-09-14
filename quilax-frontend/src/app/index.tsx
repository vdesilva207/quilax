import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing } from '@/constants/theme';
import {
  getOnboardingHref,
  isRegistrationOnboardingActive,
} from '@/utils/onboardingGate';

export default function Index() {
  const { loading, isAuthenticated, user } = useAuth() as any;
  const { t } = useTranslation();
  const [slow, setSlow] = useState(false);
  const [bootHref, setBootHref] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Failsafe: never stay on the boot spinner forever (broken storage / hung auth).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!bootHref) {
        setBootHref(isAuthenticated ? '/(app)' : '/(auth)/welcome');
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [bootHref, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (loading) return;
      if (!isAuthenticated) {
        if (!cancelled) setBootHref('/(auth)/welcome');
        return;
      }
      const active = await isRegistrationOnboardingActive();
      if (cancelled) return;
      if (active) {
        const href = getOnboardingHref(user) || '/(auth)/currency-selection';
        setBootHref(href);
        return;
      }
      setBootHref('/(app)');
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, user]);

  if (loading || !bootHref) {
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

  return <Redirect href={bootHref as any} />;
}
