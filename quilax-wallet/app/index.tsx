import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function WalletHome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quilax Wallet</Text>
      <Pressable style={styles.btn} onPress={() => router.push('/deposit')}>
        <Text style={styles.btnText}>Depositar</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => router.push('/withdraw')}>
        <Text style={styles.btnText}>Retirar</Text>
      </Pressable>
      <Pressable style={styles.btn} onPress={() => router.push('/auth/verify')}>
        <Text style={styles.btnText}>Verificar identidad</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  btn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
});
