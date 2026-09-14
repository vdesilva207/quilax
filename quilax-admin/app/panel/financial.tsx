import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';

interface FinancialStats {
  totalCredits: number;
  totalRevenue: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  completedPayments: number;
  pendingPayments: number;
  suspiciousTransactions?: number;
}

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  user?: { id: number; username?: string; email?: string };
}

/**
 * Finanzas = resumen económico.
 * Retiros NO se aprueban: se procesan solos. Vigilancia en Pagos → Sospechosas.
 */
export default function AdminFinancialScreen() {
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsData, refundsData] = await Promise.all([
        apiClient.get('/admin/financial/stats').catch(() => null),
        apiClient.get('/admin/refunds').catch(() => null),
      ]);

      setStats(statsData?.stats || null);
      setWithdrawals(refundsData?.refunds || []);
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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const statusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return Colors.light.primary;
      case 'REJECTED':
      case 'FAILED':
        return Colors.light.error;
      default:
        return Colors.light.backgroundSelected;
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title="Finanzas" subtitle="Resumen económico" />
        <ActivityIndicator style={{ marginTop: Spacing.six }} color={Colors.light.primary} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Finanzas" subtitle="Resumen · retiros automáticos" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Los retiros de usuarios se procesan solos (sin tu OK). Si hay actividad rara, ve a Pagos →
            Sospechosas para banear o cancelar.
          </Text>
        </View>

        <View style={styles.grid}>
          <Stat label="Créditos en cuentas" value={stats?.totalCredits} />
          <Stat label="Ingresos" value={stats?.totalRevenue} />
          <Stat label="Retiros totales" value={stats?.totalWithdrawals} />
          <Stat label="En curso" value={stats?.pendingWithdrawals} />
          <Stat label="Pagos OK" value={stats?.completedPayments} />
          <Stat label="Sospechosas" value={stats?.suspiciousTransactions} warn />
        </View>

        <Text style={styles.sectionTitle}>Historial de retiros (solo lectura)</Text>
        {withdrawals.length === 0 ? (
          <Text style={styles.empty}>No hay retiros todavía.</Text>
        ) : (
          withdrawals.slice(0, 40).map((w) => (
            <View key={w.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.amount}>€{w.amount}</Text>
                <Text style={styles.meta}>
                  {w.user?.username || w.user?.email || '—'} · {formatDate(w.createdAt)}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(w.status) }]}>
                <Text style={styles.badgeText}>{w.status}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </AppScreen>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value?: number;
  warn?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && styles.warn]}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  note: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  noteText: { color: Colors.light.textSecondary, fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: {
    width: '48%',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  warn: { color: Colors.light.error },
  statLabel: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: Spacing.two },
  empty: { color: Colors.light.textSecondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
  },
  amount: { fontWeight: '700', color: Colors.light.text },
  meta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
