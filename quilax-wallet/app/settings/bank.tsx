import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../src/lib/api';
import { useWalletAuth } from '../../src/context/WalletAuthContext';
import { WalletScreen } from '../../src/components/WalletScreen';
import { Colors, Spacing } from '../../src/constants/theme';

type ConnectStatus = {
  connected?: boolean;
  hasConnectAccount?: boolean;
  detailsSubmitted?: boolean;
  payoutsEnabled?: boolean;
  canWithdraw?: boolean;
  isBankVerified?: boolean;
  bankVerificationStatus?: string;
  bankLast4?: string | null;
  country?: string | null;
};

function statusCopy(s: ConnectStatus | null) {
  if (!s?.hasConnectAccount) {
    return {
      label: 'Sin conectar',
      tone: 'pending' as const,
      detail: 'Conecta tu cuenta para poder retirar premios a tu banco.',
    };
  }
  if (s.connected || s.bankVerificationStatus === 'VERIFIED' || s.payoutsEnabled) {
    return {
      label: 'Lista para retiros',
      tone: 'ok' as const,
      detail: s.bankLast4
        ? `Cuenta terminada en ····${s.bankLast4}`
        : 'Stripe ya puede enviarte transferencias.',
    };
  }
  if (s.detailsSubmitted || s.bankVerificationStatus === 'PENDING') {
    return {
      label: 'En revisión',
      tone: 'pending' as const,
      detail: 'Stripe está revisando tus datos. Suele tardar unos minutos.',
    };
  }
  return {
    label: 'Incompleta',
    tone: 'warn' as const,
    detail: 'Falta terminar el alta en Stripe (identidad o IBAN).',
  };
}

export default function BankSettingsScreen() {
  const { refreshStatus } = useWalletAuth();
  const params = useLocalSearchParams<{ return?: string; refresh?: string }>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [connect, setConnect] = useState<ConnectStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/payments/connect/status');
      setConnect(data);
      await refreshStatus().catch(() => null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el estado bancario');
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.return === '1') {
      setBanner('Has vuelto de Stripe. Actualizamos el estado de tu cuenta…');
      load();
    } else if (params.refresh === '1') {
      setBanner('El enlace de Stripe caducó o se interrumpió. Puedes continuar el alta.');
    }
  }, [params.return, params.refresh, load]);

  const openUrl = async (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = url;
      return;
    }
    await Linking.openURL(url);
  };

  const startOnboard = async (refresh = false) => {
    setBusy(true);
    setError('');
    try {
      const path = refresh ? '/payments/connect/refresh' : '/payments/connect/onboard';
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!data?.url) throw new Error('No se recibió el enlace de Stripe');
      await openUrl(data.url);
    } catch (e: any) {
      setError(e?.message || 'No se pudo abrir Stripe');
    } finally {
      setBusy(false);
    }
  };

  const openDashboard = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch('/payments/connect/dashboard', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (!data?.url) throw new Error('No se pudo abrir el panel');
      await openUrl(data.url);
    } catch (e: any) {
      setError(e?.message || 'Completa primero el alta con Stripe');
    } finally {
      setBusy(false);
    }
  };

  const copy = statusCopy(connect);

  return (
    <WalletScreen
      title="Cuenta bancaria"
      subtitle="Conectamos tu banco con Stripe Express. Quilax no guarda tu IBAN completo: lo gestiona Stripe."
    >
      {banner ? (
        <View style={styles.infoBar}>
          <Text style={styles.infoText}>{banner}</Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.three }} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>Estado</Text>
          <Text
            style={[
              styles.status,
              copy.tone === 'ok' && styles.statusOk,
              copy.tone === 'warn' && styles.statusWarn,
            ]}
          >
            {copy.label}
          </Text>
          <Text style={styles.detail}>{copy.detail}</Text>
          {connect?.country ? (
            <Text style={styles.meta}>País: {connect.country}</Text>
          ) : null}
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {busy ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <View style={styles.actions}>
          {!connect?.connected ? (
            <Pressable style={styles.btn} onPress={() => startOnboard(!!connect?.hasConnectAccount)}>
              <Text style={styles.btnText}>
                {connect?.hasConnectAccount ? 'Continuar en Stripe' : 'Conectar con Stripe'}
              </Text>
            </Pressable>
          ) : null}
          {connect?.hasConnectAccount ? (
            <Pressable style={[styles.btn, styles.btnSecondary]} onPress={openDashboard}>
              <Text style={[styles.btnText, styles.btnSecondaryText]}>Gestionar en Stripe</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={load}>
            <Text style={[styles.btnText, styles.btnGhostText]}>Actualizar estado</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.hint}>
        Tras completar el formulario de Stripe volverás aquí automáticamente. Los retiros se envían
        a la cuenta que configures allí.
      </Text>
    </WalletScreen>
  );
}

const styles = StyleSheet.create({
  infoBar: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: Spacing.three,
  },
  infoText: { color: Colors.primary, lineHeight: 20, fontSize: 14 },
  card: {
    backgroundColor: Colors.backgroundElement,
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardKicker: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  status: { fontSize: 22, fontWeight: '800', color: Colors.text },
  statusOk: { color: Colors.success },
  statusWarn: { color: '#D97706' },
  detail: { color: Colors.textSecondary, lineHeight: 22 },
  meta: { color: Colors.textSecondary, fontSize: 13 },
  error: { color: Colors.error, lineHeight: 20 },
  actions: { gap: Spacing.two, marginTop: Spacing.two },
  btn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondary: { backgroundColor: Colors.backgroundElement },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E2E8F0' },
  btnText: { color: '#fff', fontWeight: '700' },
  btnSecondaryText: { color: Colors.text },
  btnGhostText: { color: Colors.textSecondary },
  hint: { color: Colors.textSecondary, lineHeight: 20, fontSize: 13, marginTop: Spacing.two },
});
