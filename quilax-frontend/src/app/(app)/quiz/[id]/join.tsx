import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import quizRunService from '@/services/quizRunService';

export default function QuizJoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [canJoin, setCanJoin] = useState<any>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([quizRunService.canJoin(id), quizRunService.resolveActiveRunId(id)]).then(
      ([joinResult, runResult]) => {
        if (joinResult.success) setCanJoin(joinResult.data);
        if (runResult.success) setRunId(runResult.runId);
        if (!runResult.success) setError(runResult.error || null);
        setLoading(false);
      },
    );
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Unirse" subtitle="Confirma tu inscripción al quiz" />
      <View style={styles.body}>
        <AppCard>
          {canJoin?.canJoin === false ? (
            <Text style={styles.error}>{canJoin.reason || 'No puedes unirte ahora'}</Text>
          ) : (
            <Text style={styles.ok}>Puedes unirte. Coste: 1 crédito.</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>
        <Pressable
          style={[styles.btn, (!runId || canJoin?.canJoin === false) && styles.btnDisabled]}
          disabled={!runId || canJoin?.canJoin === false}
          onPress={() => router.push(`/(app)/quiz/${id}/confirm-join?runId=${runId}`)}
        >
          <Text style={styles.btnText}>Continuar</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.four },
  ok: { color: Colors.light.success, fontWeight: '700' },
  error: { color: Colors.light.error, lineHeight: 22 },
  btn: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '800' },
});
