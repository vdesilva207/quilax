import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useWalletAuth } from '../../src/context/WalletAuthContext';
import { WalletScreen } from '../../src/components/WalletScreen';
import { Colors, Spacing } from '../../src/constants/theme';

function Flag({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.dot, ok ? styles.ok : styles.pending]}>{ok ? '✓' : '○'}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function VerifyScreen() {
  const router = useRouter();
  const { status } = useWalletAuth();
  const v = status?.verification;

  return (
    <WalletScreen
      title="Verificación"
      subtitle="Estado de tu cuenta para operaciones con dinero"
    >
      <View style={styles.card}>
        <Flag ok={v?.isOver18} label="Mayor de 18 años" />
        <Flag ok={v?.idVerified} label="Identidad verificada (KYC)" />
        <Flag ok={v?.hasBankAccount || v?.hasConnectAccount} label="Cuenta bancaria registrada" />
        <Flag ok={v?.isBankVerified} label="Cuenta bancaria verificada" />
      </View>

      {!v?.isBankVerified || !v?.hasBankAccount ? (
        <Pressable style={styles.btn} onPress={() => router.push('/settings/bank')}>
          <Text style={styles.btnText}>Conectar banco con Stripe</Text>
        </Pressable>
      ) : (
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => router.push('/settings/bank')}>
          <Text style={[styles.btnText, styles.btnSecondaryText]}>Ver cuenta bancaria</Text>
        </Pressable>
      )}

      <Text style={styles.hint}>
        La identidad (KYC) se completa en la app Quilax. El banco se conecta aquí con Stripe Express.
      </Text>
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 24, textAlign: 'center', fontWeight: '700' },
  ok: { color: Colors.success },
  pending: { color: Colors.textSecondary },
  label: { color: Colors.text, fontSize: 16 },
  btn: {
    backgroundColor: Colors.primary,
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: Colors.backgroundElement },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: Colors.text },
  hint: { color: Colors.textSecondary, lineHeight: 20, marginTop: Spacing.two },
});
