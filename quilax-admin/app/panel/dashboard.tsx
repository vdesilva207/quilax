import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Switch, Pressable } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import adminService from '@/services/adminService';
import apiClient from '@/lib/api';

type DashboardStats = {
  pendingQuizzes?: number;
  todayWithdrawals?: number;
  openTickets?: number;
  activeUsersToday?: number;
  suspiciousTransactions?: number;
  totalUsers?: number;
  totalQuizzes?: number;
  quizRunsToday?: number;
  todayRevenue?: number;
};

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProviderNote, setAiProviderNote] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState('');

  const loadAiSettings = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/system/settings');
      const s = res?.settings || res;
      setAiEnabled(Boolean(s?.aiModerationEnabled));
      setAiProviderNote(s?.aiProviderNote || '');
    } catch (e: any) {
      setAiError(e?.message || 'No se pudo cargar el ajuste de IA');
    }
  }, []);

  useEffect(() => {
    Promise.all([
      adminService.getDashboardStats().then((result) => {
        if (result.success) setStats(result.data);
      }),
      loadAiSettings(),
    ]).finally(() => setLoading(false));
  }, [loadAiSettings]);

  const toggleAi = async (value: boolean) => {
    setAiSaving(true);
    setAiError('');
    const prev = aiEnabled;
    setAiEnabled(value);
    try {
      const res = await apiClient.put('/admin/system/settings', {
        aiModerationEnabled: value,
      });
      const s = res?.settings || {};
      setAiEnabled(Boolean(s.aiModerationEnabled ?? value));
      if (res?.settings?.aiProviderNote) setAiProviderNote(res.settings.aiProviderNote);
      await loadAiSettings();
    } catch (e: any) {
      setAiEnabled(prev);
      setAiError(e?.message || 'No se pudo guardar');
    } finally {
      setAiSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Dashboard" subtitle="Resumen del sistema" badge="Admin" />

      <View style={styles.toggleWrap}>
        <AppCard tint="warm">
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text style={styles.toggleTitle}>
                Moderar publicaciones y aprobar/denegar quizzes con IA
              </Text>
              <Text style={styles.toggleSub}>
                Si está activo, la app revisa quizzes y posts uno a uno. El flujo manual del
                calendario y de posts sigue disponible. Los denegados por la app aparecen en
                rojo fuerte en el calendario de corrección.
              </Text>
              {aiProviderNote ? (
                <Text style={styles.toggleNote}>{aiProviderNote}</Text>
              ) : (
                <Text style={styles.toggleNote}>
                  La UI guarda la preferencia. La revisión automática con IA todavía no está
                  cableada: hasta entonces solo vale el flujo manual.
                </Text>
              )}
              {aiError ? <Text style={styles.toggleError}>{aiError}</Text> : null}
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={toggleAi}
              disabled={aiSaving}
              trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
              thumbColor={aiEnabled ? '#16A34A' : '#F9FAFB'}
            />
          </View>
          {aiSaving ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 8 }} />
          ) : null}
          <Pressable onPress={loadAiSettings} style={styles.refreshAi}>
            <Text style={styles.refreshAiText}>Actualizar estado</Text>
          </Pressable>
        </AppCard>
      </View>

      <View style={styles.grid}>
        <AppCard>
          <Text style={styles.cardTitle}>Usuarios totales</Text>
          <Text style={styles.cardValue}>{stats?.totalUsers ?? '—'}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Activos hoy</Text>
          <Text style={styles.cardValue}>{stats?.activeUsersToday ?? '—'}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Quizzes pendientes</Text>
          <Text style={styles.cardValue}>{stats?.pendingQuizzes ?? '—'}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Quizzes totales</Text>
          <Text style={styles.cardValue}>{stats?.totalQuizzes ?? '—'}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Partidas jugadas hoy</Text>
          <Text style={styles.cardValue}>{stats?.quizRunsToday ?? '—'}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Ingresos hoy</Text>
          <Text style={styles.cardValue}>{stats?.todayRevenue ?? 0} cr.</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Retiros hoy</Text>
          <Text style={styles.cardValue}>{stats?.todayWithdrawals ?? 0}</Text>
        </AppCard>
        <AppCard>
          <Text style={styles.cardTitle}>Tickets abiertos</Text>
          <Text style={styles.cardValue}>{stats?.openTickets ?? 0}</Text>
        </AppCard>
        <AppCard tint="warm">
          <Text style={styles.cardTitle}>Transacciones sospechosas</Text>
          <Text style={styles.cardValue}>{stats?.suspiciousTransactions ?? 0}</Text>
        </AppCard>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toggleWrap: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  toggleTextCol: { flex: 1, gap: 6 },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  toggleSub: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
  },
  toggleNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  toggleError: { fontSize: 13, color: '#B91C1C', marginTop: 4 },
  refreshAi: { marginTop: 10, alignSelf: 'flex-start' },
  refreshAiText: { fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  grid: { padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 4 },
  cardValue: { fontSize: 24, fontWeight: '700', color: Colors.light.text },
});
