import { View, Text, StyleSheet } from 'react-native';
import { useWalletAuth } from '../../src/context/WalletAuthContext';
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
  const { status } = useWalletAuth();
  const v = status?.verification;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificación</Text>
      <Text style={styles.subtitle}>Estado de tu cuenta para operaciones con dinero</Text>
      <Flag ok={v?.isOver18} label="Mayor de 18 años" />
      <Flag ok={v?.idVerified} label="Identidad verificada (KYC)" />
      <Flag ok={v?.hasBankAccount} label="Cuenta bancaria registrada" />
      <Flag ok={v?.isBankVerified} label="Cuenta bancaria verificada" />
      <Text style={styles.hint}>
        Si falta algún paso, contacta con soporte desde la app Quilax o por email en quilax@appquilax.com.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.background, gap: Spacing.two },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 24, textAlign: 'center', fontWeight: '700' },
  ok: { color: Colors.success },
  pending: { color: Colors.textSecondary },
  label: { color: Colors.text, fontSize: 16 },
  hint: { color: Colors.textSecondary, lineHeight: 20, marginTop: Spacing.three },
});
