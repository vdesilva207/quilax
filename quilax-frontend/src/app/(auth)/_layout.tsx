import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="language-selection" />
      <Stack.Screen name="currency-selection" />
      <Stack.Screen name="nationality" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="id-verification" />
      <Stack.Screen name="identity-return" />
      <Stack.Screen name="face-scan" />
      <Stack.Screen name="add-bank-account" />
      <Stack.Screen name="complete-profile" />
    </Stack>
  );
}
