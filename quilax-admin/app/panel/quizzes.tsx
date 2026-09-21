import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AdminQuizCalendar from '@/components/AdminQuizCalendar';
import adminService from '@/services/adminService';

function formatWhen(value?: string | Date | null) {
  if (!value) return 'Sin fecha';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin fecha';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminQuizzesScreen() {
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPending = useCallback(async () => {
    setError('');
    const result = await adminService.getPendingQuizzes();
    if (!result.success) {
      setError(result.error || 'No se pudieron cargar los pendientes');
      setPending([]);
    } else {
      setPending(Array.isArray(result.data) ? result.data : []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void loadPending();
          }}
        />
      }
    >
      <View style={styles.pendingBox}>
        <Text style={styles.pendingTitle}>Pendientes de revisión</Text>
        <Text style={styles.pendingHint}>
          Quizzes enviados por creadores. Ábrelos para aprobar o rechazar.
        </Text>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: Spacing.three }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : pending.length === 0 ? (
          <Text style={styles.empty}>No hay quizzes pendientes ahora mismo.</Text>
        ) : (
          pending.map((q) => (
            <Pressable
              key={q.id}
              style={styles.pendingRow}
              onPress={() => router.push(`/panel/quizzes/${q.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingRowTitle} numberOfLines={1}>
                  {q.title || `Quiz #${q.id}`}
                </Text>
                <Text style={styles.pendingRowMeta}>
                  #{q.id} · {q._count?.questions ?? '—'} preguntas ·{' '}
                  {q.creator?.username || q.creator?.email || 'creador'}
                </Text>
                <Text style={styles.pendingRowMeta}>
                  Fecha pedida: {formatWhen(q.schedules?.[0]?.scheduledAt)}
                </Text>
              </View>
              <Text style={styles.openLink}>Revisar</Text>
            </Pressable>
          ))
        )}
      </View>

      <AdminQuizCalendar
        onQuizSelect={(quiz) => {
          if (quiz?.quizId) router.push(`/panel/quizzes/${quiz.quizId}`);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  pendingBox: {
    margin: Spacing.four,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    gap: Spacing.two,
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
  },
  pendingHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  empty: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    paddingVertical: Spacing.two,
  },
  error: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
  },
  pendingRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pendingRowMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  openLink: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.primary,
  },
});
