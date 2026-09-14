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
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';
import { adminService } from '@/services/adminService';

type Tab = 'overview' | 'history' | 'withdrawals' | 'suspicious' | 'alerts';

interface TxItem {
  id: number;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
  isSuspicious?: boolean;
  suspiciousReason?: string;
  user?: { id: number; email?: string; username?: string; fullName?: string };
}

interface WithdrawItem {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  user?: { id: number; email?: string; username?: string };
}

interface FinancialStats {
  totalCredits?: number;
  totalRevenue?: number;
  totalWithdrawals?: number;
  pendingWithdrawals?: number;
  completedPayments?: number;
  pendingPayments?: number;
  suspiciousTransactions?: number;
}

interface AlertItem {
  id: number;
  title: string;
  body?: string;
  message?: string;
  type: string;
  createdAt: string;
  read?: boolean;
  data?: { userId?: number; transactionId?: number };
}

const TX_LABELS: Record<string, string> = {
  WITHDRAW: 'Retiro',
  BANK_TO_CREDITS: 'Depósito',
  PRIZE_PAYOUT: 'Premio',
  QUIZ_ENTRY: 'Entrada quiz',
  QUIZ_WIN: 'Premio quiz',
  JACKPOT_DEPOSIT: 'Aporte jackpot',
  REFUND: 'Reembolso',
};

export default function PaymentsScreen() {
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [suspicious, setSuspicious] = useState<TxItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [banningId, setBanningId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsData, txsData, susData, notifData, refundsData] = await Promise.all([
        apiClient.get('/admin/financial/stats').catch(() => null),
        apiClient.get('/transactions/admin/all?period=all-time&limit=40').catch(() => null),
        apiClient.get('/transactions/suspicious?limit=30').catch(() => null),
        apiClient.get('/admin/notifications').catch(() => null),
        apiClient.get('/admin/refunds?status=PENDING_REVIEW').catch(() => null),
      ]);

      setStats(statsData?.stats || statsData || null);
      setTxs(txsData?.transactions || []);
      setSuspicious(susData?.transactions || []);
      setWithdrawals(refundsData?.refunds || []);
      const rawNotifs = notifData?.notifications || [];
      setAlerts(
        rawNotifs.filter(
          (n: AlertItem) =>
            n.type === 'SUSPICIOUS_TRANSACTION' ||
            String(n.title || '').toLowerCase().includes('sospechos') ||
            String(n.type || '').toLowerCase().includes('payment') ||
            String(n.type || '').toLowerCase().includes('withdraw')
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const banUser = (userId: number, label: string) => {
    Alert.alert(
      'Bloquear usuario',
      `¿Banear a ${label}? Podrá revisar luego en Usuarios.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Banear',
          style: 'destructive',
          onPress: async () => {
            setBanningId(userId);
            try {
              const result = await adminService.banUser(userId, {
                category: 'SUSPICIOUS',
                permanent: true,
                reason: 'Actividad sospechosa (panel Pagos)',
                message:
                  'Tu cuenta ha sido suspendida por actividad sospechosa. El saldo no es recuperable. Contacta soporte solo si crees que es un error.',
              });
              if (result.success) {
                Alert.alert('Hecho', 'Usuario bloqueado');
                load(true);
              } else {
                Alert.alert('Error', result.error || 'No se pudo banear');
              }
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Error al banear');
            } finally {
              setBanningId(null);
            }
          },
        },
      ]
    );
  };

  const processWithdrawal = (w: WithdrawItem, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Aprobar retiro' : 'Rechazar retiro',
      action === 'approve'
        ? `¿Aprobar retiro #${w.id} de ${w.amount} cr?`
        : `¿Rechazar retiro #${w.id}? Se devolverá el saldo al usuario.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action === 'approve' ? 'Aprobar' : 'Rechazar',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setProcessingId(w.id);
            try {
              await apiClient.post(`/admin/refunds/${w.id}/process`, {
                action,
                reason: action === 'reject' ? 'Rechazado en revisión manual' : undefined,
              });
              Alert.alert('Hecho', action === 'approve' ? 'Retiro aprobado' : 'Retiro rechazado');
              load(true);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo procesar');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const cancelOpenWithdraw = async (userId: number) => {
    Alert.alert(
      'Cancelar retiros abiertos',
      'Se rechazarán retiros en curso de este usuario y se devolverá el saldo. Solo para casos sospechosos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: async () => {
            setRejectingId(userId);
            try {
              const data = await apiClient.get('/admin/refunds');
              const open = (data.refunds || []).filter(
                (w: { userId?: number; user?: { id: number }; status: string }) =>
                  (w.userId === userId || w.user?.id === userId) &&
                  ['REQUESTED', 'PENDING', 'PROCESSING'].includes(w.status)
              );
              for (const w of open) {
                await apiClient.post(`/admin/refunds/${w.id}/process`, {
                  action: 'reject',
                  reason: 'Cancelado por actividad sospechosa',
                });
              }
              Alert.alert(
                'Listo',
                open.length ? `Se cancelaron ${open.length} retiro(s).` : 'No había retiros abiertos.'
              );
              load(true);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo cancelar');
            } finally {
              setRejectingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title="Pagos" subtitle="Cartera de la plataforma" />
        <ActivityIndicator style={{ marginTop: Spacing.six }} color={Colors.light.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        title="Pagos"
        subtitle="Como la Gestión del usuario: saldo, movimientos y alertas"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Créditos en cuentas (usuarios)</Text>
          <Text style={styles.balanceValue}>{stats?.totalCredits ?? '—'} cr</Text>
          <Text style={styles.balanceHint}>
            Los retiros se pagan solos. Aquí vigilas movimientos y actividad rara.
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.totalRevenue ?? '—'}</Text>
            <Text style={styles.statLabel}>Ingresos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats?.totalWithdrawals ?? '—'}</Text>
            <Text style={styles.statLabel}>Retiros</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, styles.warn]}>
              {stats?.suspiciousTransactions ?? suspicious.length}
            </Text>
            <Text style={styles.statLabel}>Sospechosas</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(
            [
              ['overview', 'Resumen'],
              ['history', 'Historial'],
              [
                'withdrawals',
                `Retenidos${withdrawals.length ? ` (${withdrawals.length})` : ''}`,
              ],
              ['suspicious', 'Sospechosas'],
              ['alerts', 'Avisos'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.tab, tab === key && styles.tabActive]}
              onPress={() => setTab(key)}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Últimos movimientos</Text>
            {txs.slice(0, 8).map((tx) => (
              <TxRow key={tx.id} tx={tx} formatDate={formatDate} />
            ))}
            {txs.length === 0 && <Text style={styles.empty}>Sin movimientos aún.</Text>}
            <Pressable onPress={() => setTab('history')}>
              <Text style={styles.link}>Ver historial completo →</Text>
            </Pressable>
          </View>
        )}

        {tab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historial de transacciones</Text>
            {txs.map((tx) => (
              <TxRow key={tx.id} tx={tx} formatDate={formatDate} />
            ))}
            {txs.length === 0 && <Text style={styles.empty}>Sin movimientos.</Text>}
          </View>
        )}

        {tab === 'withdrawals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Retiros retenidos por sospecha</Text>
            <Text style={styles.hint}>
              Los retiros normales se pagan solos. Aquí solo entran los que la app marcó como sospechosos.
            </Text>
            {withdrawals.map((w) => (
              <View key={w.id} style={styles.txRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>#{w.id} · {w.amount} cr</Text>
                  <Text style={styles.txMeta}>
                    {w.user?.username || w.user?.email || `user#${w.user?.id}`}
                  </Text>
                  <Text style={styles.txMeta}>{formatDate(w.createdAt)}</Text>
                  <Text style={styles.txMeta}>{w.status}</Text>
                </View>
                <View style={styles.actionsCol}>
                  <Pressable
                    style={styles.approveBtn}
                    disabled={processingId === w.id}
                    onPress={() => processWithdrawal(w, 'approve')}
                  >
                    <Text style={styles.banBtnText}>
                      {processingId === w.id ? '…' : 'Aprobar'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.cancelBtn}
                    disabled={processingId === w.id}
                    onPress={() => processWithdrawal(w, 'reject')}
                  >
                    <Text style={styles.cancelBtnText}>Rechazar</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {withdrawals.length === 0 && (
              <Text style={styles.empty}>No hay retiros pendientes de revisión.</Text>
            )}
          </View>
        )}

        {tab === 'suspicious' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actividad sospechosa</Text>
            <Text style={styles.hint}>
              No hace falta aprobar retiros normales. Si algo huele mal, bloquea al usuario o cancela sus retiros.
            </Text>
            {suspicious.map((tx) => {
              const label = tx.user?.username || tx.user?.email || `user#${tx.user?.id}`;
              const uid = tx.user?.id;
              return (
                <View key={tx.id} style={[styles.txRow, styles.suspiciousCard]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txType}>{TX_LABELS[tx.type] || tx.type}</Text>
                    <Text style={styles.txMeta}>{label}</Text>
                    <Text style={styles.txMeta}>{formatDate(tx.createdAt)}</Text>
                    {tx.suspiciousReason ? (
                      <Text style={styles.reason}>{tx.suspiciousReason}</Text>
                    ) : null}
                  </View>
                  <View style={styles.actionsCol}>
                    <Text style={styles.txAmount}>{tx.amount} cr</Text>
                    {uid ? (
                      <>
                        <Pressable
                          style={styles.banBtn}
                          disabled={banningId === uid}
                          onPress={() => banUser(uid, label)}
                        >
                          <Text style={styles.banBtnText}>
                            {banningId === uid ? '…' : 'Banear'}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.cancelBtn}
                          disabled={rejectingId === uid}
                          onPress={() => cancelOpenWithdraw(uid)}
                        >
                          <Text style={styles.cancelBtnText}>
                            {rejectingId === uid ? '…' : 'Cancelar retiros'}
                          </Text>
                        </Pressable>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
            {suspicious.length === 0 && (
              <Text style={styles.empty}>No hay transacciones marcadas como sospechosas.</Text>
            )}
          </View>
        )}

        {tab === 'alerts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avisos a admin (pagos / sospecha)</Text>
            {alerts.map((a) => (
              <View key={a.id} style={styles.alertCard}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertBody}>{a.body || a.message}</Text>
                <Text style={styles.txMeta}>{formatDate(a.createdAt)}</Text>
                {a.data?.userId ? (
                  <Pressable
                    style={[styles.banBtn, { alignSelf: 'flex-start', marginTop: 8 }]}
                    onPress={() => banUser(a.data!.userId!, `user#${a.data!.userId}`)}
                  >
                    <Text style={styles.banBtnText}>Banear usuario</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {alerts.length === 0 && <Text style={styles.empty}>Sin avisos de este tipo.</Text>}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function TxRow({
  tx,
  formatDate,
}: {
  tx: TxItem;
  formatDate: (s: string) => string;
}) {
  const label = tx.user?.username || tx.user?.email || '';
  return (
    <View style={[styles.txRow, tx.isSuspicious && styles.suspiciousCard]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.txType}>{TX_LABELS[tx.type] || tx.description || tx.type}</Text>
        <Text style={styles.txMeta}>
          {label ? `${label} · ` : ''}
          {formatDate(tx.createdAt)}
        </Text>
      </View>
      <Text style={[styles.txAmount, tx.amount < 0 && styles.neg]}>
        {tx.amount >= 0 ? '+' : ''}
        {tx.amount} cr
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 48 },
  balanceCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 16,
    padding: Spacing.five,
    alignItems: 'center',
  },
  balanceLabel: { color: Colors.light.textSecondary, fontSize: 14 },
  balanceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.light.text,
    marginVertical: Spacing.two,
  },
  balanceHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    alignItems: 'center',
  },
  statNum: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  warn: { color: Colors.light.error },
  statLabel: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.light.backgroundElement,
  },
  tabActive: { backgroundColor: Colors.light.primary },
  tabText: { fontSize: 13, color: Colors.light.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  hint: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  empty: { color: Colors.light.textSecondary, paddingVertical: Spacing.three },
  link: { color: Colors.light.primary, fontWeight: '600', marginTop: Spacing.two },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  suspiciousCard: { borderWidth: 1, borderColor: Colors.light.error },
  txType: { fontWeight: '600', color: Colors.light.text },
  txMeta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  txAmount: { fontWeight: '700', color: Colors.light.primary },
  neg: { color: Colors.light.error },
  reason: { fontSize: 12, color: Colors.light.error, marginTop: 6, lineHeight: 16 },
  actionsCol: { alignItems: 'flex-end', gap: 6 },
  banBtn: {
    backgroundColor: Colors.light.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approveBtn: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  banBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.light.error,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cancelBtnText: { color: Colors.light.error, fontSize: 11, fontWeight: '600' },
  alertCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    gap: 4,
  },
  alertTitle: { fontWeight: '700', color: Colors.light.text },
  alertBody: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 18 },
});
