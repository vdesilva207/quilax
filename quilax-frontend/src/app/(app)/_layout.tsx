import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import CustomTabBar from '@/components/CustomTabBar';
import {
  clearRegistrationOnboarding,
  isOnboardingComplete,
} from '@/utils/onboardingGate';

export default function AppLayout() {
  const { t } = useTranslation();
  const { loading, isAuthenticated, user } = useAuth() as any;

  useEffect(() => {
    // Solo limpiar el flag de registro cuando el perfil ya está completo
    if (isAuthenticated && isOnboardingComplete(user)) {
      void clearRegistrationOnboarding();
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.primary,
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search') }} />
      <Tabs.Screen name="quiz" options={{ title: t('tabs.create') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
      <Tabs.Screen name="wallet" options={{ title: t('tabs.wallet') }} />
      <Tabs.Screen name="messages" options={{ title: t('tabs.messages') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="matches" options={{ href: null }} />
      <Tabs.Screen name="season" options={{ href: null }} />
    </Tabs>
  );
}
