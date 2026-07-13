import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import adminService from '@/services/adminService';

export default function WorkerDashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats().then((result) => {
      if (result.success) setStats(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <AppScreen>
      <AppHeader title="Worker Dashboard" subtitle="Vista limitada para empleados" badge="WORKER" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : (
        <View style={styles.grid}>
          <AppCard><Text style={styles.cardTitle}>Quizzes pendientes</Text><Text style={styles.cardValue}>{stats?.pendingQuizzes ?? '—'}</Text></AppCard>
          <AppCard><Text style={styles.cardTitle}>Usuarios</Text><Text style={styles.cardValue}>{stats?.totalUsers ?? '—'}</Text></AppCard>
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
