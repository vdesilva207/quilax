import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PanelAuthGate from '@/components/PanelAuthGate';
import '@/global.css';

export default function RootLayout() {
  return (
    <PanelAuthGate>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="panel" />
      </Stack>
    </PanelAuthGate>
  );
}
