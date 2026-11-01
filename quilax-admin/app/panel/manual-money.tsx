import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';

type Section = 'deposits' | 'withdraws';

interface DepositRow {
  id: number;
  referenceCode: string;
  creditsRequested: number;
  amountExpected: number;
  currency: string;
  status: string;
  createdAt: string;
  expiresAt?: string;
  user?: { id: number; email?: string; username?: string; fullName?: string };
}

interface WithdrawRow {
  id: number;
  amount: number;
  currency?: string;
  status: string;
  payoutMethod?: string;
  bankAccountIban?: string;
  bankAccountName?: string;
  createdAt: string;
  adminNotes?: string;
  user?: { id: number; email?: string; username?: string; fullName?: string };
}

export default function ManualMoneyScreen() {
  const [section, setSection] = useState<Section>('deposits');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [withdraws, setWithdraws] = useState<WithdrawRow[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const [dep, wdr] = await Promise.all([
        apiClient.get('/admin/manual-deposits?status=PENDING').catch(() => null),
        apiClient.get('/admin/manual-withdraws?status=REQUESTED').catch(() => null),
      ]);
      setDeposits(dep?.deposits || []);
      setWithdraws(wdr?.withdraws || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo cargar la cola manual');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmDeposit = async (id: number) => {
    const ok =
      Platform.OS === 'web'
        ? window.confirm('¿Confirmas que has recibido la transferencia? Se acreditarán los créditos.')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Confirmar depósito', '¿Has recibido la transferencia?', [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Confirmar', onPress: () => resolve(true) },
            ]);
          });
    if (!ok) return;
    setBusyId(id);
    try {
      await apiClient.post(`/admin/manual-deposits/${id}/confirm`, {});
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo confirmar');
    } finally {
      setBusyId(null);
    }
  };

  const rejectDeposit = async (id: number) => {
    const ok =
      Platform.OS === 'web'
        ? window.confirm('¿Rechazar este depósito pendiente?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Rechazar', '¿Rechazar este depósito?', [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Rechazar', style: 'destructive', onPress: () => resolve(true) },
            ]);
          });
    if (!ok) return;
    setBusyId(id);
    try {
      await apiClient.post(`/admin/manual-deposits/${id}/reject`, {
        adminNotes: 'Rechazado por ops',
      });
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo rechazar');
    } finally {
      setBusyId(null);
    }
  };

  const completeWithdraw = async (id: number) => {
    const ok =
      Platform.OS === 'web'
        ? window.confirm('¿Marcar como pagado? Solo si ya enviaste la SEPA al IBAN del usuario.')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Marcar pagado',
              'Confirma que ya enviaste la transferencia SEPA.',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Pagado', onPress: () => resolve(true) },
              ],
            );
          });
    if (!ok) return;
    setBusyId(id);
    try {
      await apiClient.post(`/admin/manual-withdraws/${id}/complete`, {
        adminNotes: 'SEPA enviada',
      });
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo completar');
    } finally {
      setBusyId(null);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
      }
    >
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.title}>Dinero manual</Text>
        <Text style={styles.subtitle}>
          Soft-launch · transferencias IBAN (sin Stripe)
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, section === 'deposits' && styles.tabActive]}
            onPress={() => setSection('deposits')}
          >
            <Text style={styles.tabText}>
              Depósitos ({deposits.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, section === 'withdraws' && styles.tabActive]}
            onPress={() => setSection('withdraws')}
          >
            <Text style={styles.tabText}>
              Retiros ({withdraws.length})
            </Text>
          </Pressable>
        </View>

        {section === 'deposits' ? (
          deposits.length === 0 ? (
            <Text style={styles.empty}>No hay depósitos pendientes</Text>
          ) : (
            deposits.map((d) => (
              <View key={d.id} style={styles.card}>
                <Text style={styles.amount}>
                  {d.creditsRequested} créditos · {d.amountExpected} {d.currency}
                </Text>
                <Text style={styles.meta}>
                  {d.user?.username || d.user?.email || `user #${d.user?.id}`}
                </Text>
                <Text style={styles.ref}>Concepto: {d.referenceCode}</Text>
                <Text style={styles.meta}>Creado: {fmt(d.createdAt)}</Text>
                {d.expiresAt ? (
                  <Text style={styles.meta}>Caduca: {fmt(d.expiresAt)}</Text>
                ) : null}
                <View style={styles.row}>
                  <Pressable
                    style={[styles.btn, styles.btnOk]}
                    disabled={busyId === d.id}
                    onPress={() => confirmDeposit(d.id)}
                  >
                    {busyId === d.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnText}>Confirmar recibido</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.btn, styles.btnBad]}
                    disabled={busyId === d.id}
                    onPress={() => rejectDeposit(d.id)}
                  >
                    <Text style={styles.btnText}>Rechazar</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : withdraws.length === 0 ? (
          <Text style={styles.empty}>No hay retiros manuales pendientes</Text>
        ) : (
          withdraws.map((w) => (
            <View key={w.id} style={styles.card}>
              <Text style={styles.amount}>
                {w.amount} {w.currency || 'EUR'}
              </Text>
              <Text style={styles.meta}>
                {w.user?.username || w.user?.email || `user #${w.user?.id}`}
              </Text>
              <Text style={styles.ref}>IBAN: {w.bankAccountIban || '—'}</Text>
              <Text style={styles.meta}>
                Titular: {w.bankAccountName || '—'}
              </Text>
              <Text style={styles.meta}>Solicitado: {fmt(w.createdAt)}</Text>
              <Pressable
                style={[styles.btn, styles.btnOk, { marginTop: Spacing.two }]}
                disabled={busyId === w.id}
                onPress={() => completeWithdraw(w.id)}
              >
                {busyId === w.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Marcar SEPA enviada</Text>
                )}
              </Pressable>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  title: { fontSize: 36, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 4 },
  content: { padding: Spacing.four, gap: Spacing.three },
  tabs: { flexDirection: 'row', gap: Spacing.two },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.light.backgroundSelected },
  tabText: { fontWeight: '700', color: Colors.light.text },
  empty: { textAlign: 'center', color: Colors.light.textSecondary, marginTop: Spacing.four },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
  },
  amount: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  meta: { fontSize: 13, color: Colors.light.textSecondary },
  ref: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
    marginVertical: 4,
  },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOk: { backgroundColor: Colors.light.primary },
  btnBad: { backgroundColor: Colors.light.error },
  btnText: { color: '#fff', fontWeight: '700' },
});
