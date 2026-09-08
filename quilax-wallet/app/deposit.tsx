import { useEffect, useState } from 'react';
import { Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../src/lib/api';
import { describeMoneyGateError } from '../src/lib/moneyGate';
import { useWalletAuth } from '../src/context/WalletAuthContext';
import { WalletScreen } from '../src/components/WalletScreen';
import { Colors, Spacing } from '../src/constants/theme';

type Package = { credits: number; bonus: number; label: string };

export default function DepositScreen() {
  const router = useRouter();
  const { refreshStatus, status } = useWalletAuth();
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

  const showGate = (error: any) => {
    const info = describeMoneyGateError(error);
    const buttons: any[] = [{ text: 'OK', style: 'cancel' }];
    if (info.action === 'kyc') {
      buttons.unshift({
        text: 'Ver verificación',
        onPress: () => router.push('/auth/verify'),
      });
    }
    if (info.action === 'bank') {
      buttons.unshift({
        text: 'Conectar banco',
        onPress: () => router.push('/settings/bank'),
      });
    }
    Alert.alert(info.title, info.body, buttons);
  };

  const handleBuy = async (credits: number) => {
    if (!status?.verification?.idVerified && !status?.verification?.isOver18) {
      // Soft hint; server still enforces
    }
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
      showGate(error);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <WalletScreen title="Depositar fondos" subtitle="Elige un paquete de créditos">
      {!status?.verification?.idVerified ? (
        <Pressable style={styles.warn} onPress={() => router.push('/auth/verify')}>
          <Text style={styles.warnText}>
            Necesitas identidad verificada (KYC) en la app Quilax antes de depositar →
          </Text>
        </Pressable>
      ) : null}
      {loading ? <Text style={styles.meta}>Cargando paquetes…</Text> : null}
      {packages.map((pkg) => (
        <Pressable
          key={pkg.credits}
          style={styles.card}
          disabled={submitting !== null}
          onPress={() => handleBuy(pkg.credits)}
        >
          <Text style={styles.cardTitle}>{pkg.label}</Text>
          <Text style={styles.cardMeta}>
            {pkg.credits} € · +{pkg.bonus} bonus
          </Text>
          {submitting === pkg.credits ? <Text style={styles.meta}>Procesando…</Text> : null}
        </Pressable>
      ))}
      <Pressable style={styles.link} onPress={() => router.push('/settings/bank')}>
        <Text style={styles.linkText}>¿Vas a retirar después? Conecta tu banco →</Text>
      </Pressable>
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  meta: { color: Colors.textSecondary },
  warn: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: Spacing.three,
  },
  warnText: { color: '#92400E', fontWeight: '600', lineHeight: 20 },
  card: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    gap: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardMeta: { color: Colors.textSecondary },
  link: { marginTop: Spacing.two, paddingVertical: Spacing.two },
  linkText: { color: Colors.primary, fontWeight: '700' },
});
