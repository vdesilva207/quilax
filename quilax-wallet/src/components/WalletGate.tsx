import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../constants/theme';
import { useWalletAuth } from '../context/WalletAuthContext';

export function WalletGate() {
  const { authError } = useWalletAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.badge}>Quilax Wallet</Text>
        <Text style={styles.title}>Acceso solo desde la app</Text>
        <Text style={styles.text}>
          Para depositar, retirar o verificar tu identidad, abre Gestión desde la app Quilax
          (pestaña Wallet → Abrir gestión web).
        </Text>
        {authError ? (
          <Text style={styles.error}>
            No se pudo validar el token: {authError}
          </Text>
        ) : (
          <Text style={styles.hint}>
            Si acabas de pulsar el botón y ves esto, comprueba que la wallet esté en marcha en el
            puerto 8082 y que la API responda.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.background,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    backgroundColor: Colors.backgroundElement,
    gap: Spacing.two,
  },
  badge: {
    alignSelf: 'flex-start',
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  text: { color: Colors.textSecondary, lineHeight: 22, fontSize: 15 },
  hint: { color: Colors.textSecondary, fontSize: 13, marginTop: Spacing.two },
  error: { color: Colors.error, fontSize: 13, marginTop: Spacing.two, lineHeight: 18 },
});
