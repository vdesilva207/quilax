import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="account" />
      <Stack.Screen name="bank" />
      <Stack.Screen name="currency" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="security" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="language" />
      <Stack.Screen name="blocked" />
      <Stack.Screen name="help" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="tickets" />
      <Stack.Screen name="tickets/[id]" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
