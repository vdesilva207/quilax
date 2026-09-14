import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';

interface LogEntry {
  id?: number | string;
  level?: string;
  message?: string;
  action?: string;
  category?: string;
  createdAt?: string;
  userId?: number;
  metadata?: Record<string, unknown>;
}

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await apiClient.get('/admin/logs');
      setLogs(data.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar logs');
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLevelColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'ERROR':
        return Colors.light.error;
      case 'WARN':
      case 'WARNING':
        return Colors.light.backgroundSelected;
      case 'INFO':
        return Colors.light.primary;
      default:
        return Colors.light.textSecondary;
    }
  };

  return (
    <AppScreen>
      <AppHeader title="Gestión de Logs" subtitle="Accesos, acciones y eventos del sistema" />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.primary} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchLogs(true)} />
          }
        >
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {logs.length === 0 && !error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sin registros</Text>
              <Text style={styles.emptyText}>
                No hay logs disponibles en este momento. El endpoint responde correctamente; los eventos aparecerán aquí cuando el backend los registre.
              </Text>
            </View>
          ) : (
            logs.map((log, index) => (
              <View key={log.id ?? index} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logAction}>
                    {log.action || log.category || log.message || 'Evento'}
                  </Text>
                  {log.level ? (
                    <View style={[styles.levelBadge, { backgroundColor: getLevelColor(log.level) }]}>
                      <Text style={styles.levelText}>{log.level}</Text>
                    </View>
                  ) : null}
                </View>
                {log.message && log.action ? (
                  <Text style={styles.logMessage}>{log.message}</Text>
                ) : null}
                <Text style={styles.logDate}>{formatDate(log.createdAt)}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
  loader: { marginTop: Spacing.six },
  errorBox: {
    backgroundColor: '#fee2e2',
    padding: Spacing.three,
    borderRadius: 12,
  },
  errorText: { color: Colors.light.error, fontSize: 14 },
  emptyBox: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  logCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  logAction: { fontSize: 16, fontWeight: '600', color: Colors.light.text, flex: 1 },
  levelBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: Spacing.two,
  },
  levelText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  logMessage: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: Spacing.one },
  logDate: { fontSize: 12, color: Colors.light.textSecondary },
});
