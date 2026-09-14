import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SecureSessionGuard } from '@/components/SecureSessionGuard';
import { SessionBootstrap } from '@/components/SessionBootstrap';
import { hydrateAppLanguage } from '@/i18n';
import '@/i18n';

export default function RootLayout() {
  useEffect(() => {
    void hydrateAppLanguage();
  }, []);

  return (
    <SessionBootstrap>
      <SecureSessionGuard>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade_from_bottom',
            animationDuration: 260,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="sso" />
          <Stack.Screen name="recover-balance" />
          <Stack.Screen name="deposit" />
          <Stack.Screen name="withdraw" />
          <Stack.Screen name="history" />
          <Stack.Screen name="bank/index" />
          <Stack.Screen name="bank/link" />
          <Stack.Screen name="security/2fa" />
          <Stack.Screen name="legal" />
        </Stack>
      </SecureSessionGuard>
    </SessionBootstrap>
  );
}
