import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import adminService from '@/services/adminService';

type WorkerStats = {
  pendingWithdrawals?: number;
  openTickets?: number;
  activeUsersToday?: number;
};

export default function WorkerDashboardScreen() {
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getWorkerDashboardStats().then((result) => {
      if (result.success) setStats(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <AppScreen>
      <AppHeader title="Dashboard" subtitle="Resumen del panel" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : (
        <View style={styles.grid}>
          <AppCard><Text style={styles.cardTitle}>Retiros procesados hoy</Text><Text style={styles.cardValue}>{stats?.pendingWithdrawals ?? '—'}</Text></AppCard>
          <AppCard><Text style={styles.cardTitle}>Tickets abiertos</Text><Text style={styles.cardValue}>{stats?.openTickets ?? '—'}</Text></AppCard>
          <AppCard><Text style={styles.cardTitle}>Usuarios activos hoy</Text><Text style={styles.cardValue}>{stats?.activeUsersToday ?? '—'}</Text></AppCard>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  grid: { padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
});
