import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { Pressable } from 'react-native';

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestión de fondos</Text>
      <Text style={styles.balance}>{user?.balance ?? 0} créditos</Text>

      <Pressable style={styles.button} onPress={() => router.push('/(app)/wallet/add-funds')}>
        <Text style={styles.buttonText}>Añadir fondos</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondary]} onPress={() => router.push('/(app)/wallet/withdraw')}>
        <Text style={[styles.buttonText, styles.secondaryText]}>Retirar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: '700', marginBottom: Spacing.two },
  balance: { fontSize: 32, fontWeight: '800', color: Colors.light.primary, marginBottom: Spacing.four },
  button: { backgroundColor: Colors.light.primary, padding: Spacing.three, borderRadius: 12, alignItems: 'center', marginBottom: Spacing.two },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: Colors.light.backgroundElement },
  secondaryText: { color: Colors.light.text },
});
