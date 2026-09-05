import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WalletAuthProvider, useWalletAuth } from '../src/context/WalletAuthContext';
import { Colors } from '../src/constants/theme';

function WalletNavigator() {
  const { ready } = useWalletAuth();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Siempre montar el Stack: /sso debe poder capturar el token sin auth previa.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sso" />
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/verify" />
      <Stack.Screen name="deposit" />
      <Stack.Screen name="withdraw" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <WalletAuthProvider>
      <StatusBar style="auto" />
      <WalletNavigator />
    </WalletAuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
});
