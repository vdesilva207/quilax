import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';

const LINKS = [
  { label: 'Temporadas y jackpot', href: '/panel/seasons' },
  { label: 'Reparto de quizzes', href: '/panel/quiz-distribution' },
  { label: 'Gestión de admins', href: '/panel/admins' },
  { label: 'Mi contraseña', href: '/panel/change-password' },
  { label: 'Notificaciones globales', href: '/panel/notifications' },
];

interface SystemStatus {
  status?: string;
  uptime?: number;
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  memory?: {
    rss?: number;
    heapTotal?: number;
    heapUsed?: number;
    external?: number;
  };
}

function formatUptime(seconds?: number) {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '—';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export default function SystemScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await apiClient.get('/admin/system/status');
      setStatus(data.systemStatus ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al obtener estado del sistema');
      setStatus(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <AppScreen>
      <AppHeader title="Sistema" subtitle="Configuración general" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchStatus(true)} />
        }
      >
        <Text style={styles.sectionTitle}>Estado del servidor</Text>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: Spacing.four }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado</Text>
              <Text style={[styles.statusValue, status?.status === 'healthy' && styles.healthy]}>
                {status?.status ?? '—'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Uptime</Text>
              <Text style={styles.statusValue}>{formatUptime(status?.uptime)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Node</Text>
              <Text style={styles.statusValue}>{status?.nodeVersion ?? '—'}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Plataforma</Text>
              <Text style={styles.statusValue}>
                {status?.platform ?? '—'} ({status?.arch ?? '—'})
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Memoria RSS</Text>
              <Text style={styles.statusValue}>{formatBytes(status?.memory?.rss)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Heap usado</Text>
              <Text style={styles.statusValue}>{formatBytes(status?.memory?.heapUsed)}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Heap total</Text>
              <Text style={styles.statusValue}>{formatBytes(status?.memory?.heapTotal)}</Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.four }]}>Accesos rápidos</Text>
        <View style={styles.list}>
          {LINKS.map((link) => (
            <Pressable key={link.href} style={styles.item} onPress={() => router.push(link.href as any)}>
              <Text style={styles.label}>{link.label}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.four },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  statusCard: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: { fontSize: 14, color: Colors.light.textSecondary },
  statusValue: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  healthy: { color: Colors.light.primary },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: Spacing.three,
    borderRadius: 12,
  },
  errorText: { color: Colors.light.error, fontSize: 14 },
  list: { gap: Spacing.two },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
  },
  label: { fontSize: 16, fontWeight: '600' },
  arrow: { fontSize: 20, color: Colors.light.textSecondary },
});
