import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import adminService from '@/services/adminService';

export default function DashboardScreen() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats().then((result) => {
      if (result.success) setStats(result.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Dashboard" subtitle="Resumen del sistema" />
      <View style={styles.grid}>
        <AppCard><Text style={styles.cardTitle}>Usuarios</Text><Text style={styles.cardValue}>{stats?.totalUsers ?? '—'}</Text></AppCard>
        <AppCard><Text style={styles.cardTitle}>Quizzes activos</Text><Text style={styles.cardValue}>{stats?.activeQuizzes ?? '—'}</Text></AppCard>
        <AppCard><Text style={styles.cardTitle}>Ingresos</Text><Text style={styles.cardValue}>{stats?.totalRevenue ?? 0} €</Text></AppCard>
        <AppCard><Text style={styles.cardTitle}>Jackpot</Text><Text style={styles.cardValue}>{stats?.jackpotPool ?? 0} cr</Text></AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  grid: { padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
});
