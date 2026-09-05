import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useWalletAuth } from '../src/context/WalletAuthContext';
import { WalletGate } from '../src/components/WalletGate';
import { Colors, Spacing } from '../src/constants/theme';

export default function WalletHome() {
  const router = useRouter();
  const { authenticated, status, signOut } = useWalletAuth();

  if (!authenticated) {
    return <WalletGate />;
  }

  const balance = status?.balance ?? 0;
  const currency = status?.currency ?? 'EUR';
  const name = status?.user?.fullName || status?.user?.username || status?.user?.email || 'Usuario';

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Quilax · Gestión</Text>
        <Text style={styles.title}>Hola, {name}</Text>
        <Text style={styles.balance}>{balance} créditos</Text>
        <Text style={styles.meta}>Moneda: {currency}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.btn} onPress={() => router.push('/deposit')}>
          <Text style={styles.btnText}>Depositar</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => router.push('/withdraw')}>
          <Text style={[styles.btnText, styles.btnSecondaryText]}>Retirar</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => router.push('/auth/verify')}>
          <Text style={[styles.btnText, styles.btnSecondaryText]}>Verificar identidad</Text>
        </Pressable>
      </View>

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Cerrar sesión de wallet</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.four, gap: Spacing.four },
  hero: {
    borderRadius: 16,
    padding: Spacing.four,
    backgroundColor: Colors.backgroundElement,
    gap: Spacing.two,
  },
  kicker: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  balance: { fontSize: 36, fontWeight: '800', color: Colors.primary },
  meta: { color: Colors.textSecondary },
  actions: { gap: Spacing.two },
  btn: { backgroundColor: Colors.primary, padding: Spacing.three, borderRadius: 12, alignItems: 'center' },
  btnSecondary: { backgroundColor: Colors.backgroundElement },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: Colors.text },
  signOut: { marginTop: 'auto', alignItems: 'center' },
  signOutText: { color: Colors.textSecondary, fontSize: 14 },
});
