import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { apiFetch } from '../src/lib/api';
import { useWalletAuth } from '../src/context/WalletAuthContext';
import { Colors, Spacing } from '../src/constants/theme';

type Package = { credits: number; bonus: number; label: string };

export default function DepositScreen() {
  const { refreshStatus } = useWalletAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch('/payments/packages');
        setPackages(data.packages || []);
      } catch (error) {
        Alert.alert('Error', error instanceof Error ? error.message : 'No se pudieron cargar paquetes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBuy = async (credits: number) => {
    setSubmitting(credits);
    try {
      const data = await apiFetch('/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ credits }),
      });
      Alert.alert(
        'Pago iniciado',
        `Se ha creado el pago de ${data.paymentIntent?.credits ?? credits} créditos. Completa el flujo de Stripe cuando esté conectado en esta pantalla.`
      );
      await refreshStatus();
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo iniciar el pago');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Depositar fondos</Text>
      <Text style={styles.subtitle}>Elige un paquete de créditos</Text>
      {loading ? <Text style={styles.meta}>Cargando paquetes…</Text> : null}
      {packages.map((pkg) => (
        <Pressable
          key={pkg.credits}
          style={styles.card}
          disabled={submitting !== null}
          onPress={() => handleBuy(pkg.credits)}
        >
          <Text style={styles.cardTitle}>{pkg.label}</Text>
          <Text style={styles.cardMeta}>{pkg.credits} € · +{pkg.bonus} bonus</Text>
          {submitting === pkg.credits ? <Text style={styles.meta}>Procesando…</Text> : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.four, gap: Spacing.two, backgroundColor: Colors.background },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.two },
  meta: { color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardMeta: { color: Colors.textSecondary },
});
