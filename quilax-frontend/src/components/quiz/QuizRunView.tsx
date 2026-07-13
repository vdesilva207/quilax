import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import quizRunService from '@/services/quizRunService';
import apiClient from '@/lib/api';

const PHASE_LABELS: Record<string, string> = {
  PRE_START: 'Preparación',
  QUESTION_READ: 'Lectura de pregunta',
  QUESTION_ANSWER: 'Responde ahora',
  QUESTION_CORRECTION: 'Corrección',
  QUESTION_RANKING: 'Ranking parcial',
  FINISHED: 'Finalizado',
};

type QuizRunViewProps = {
  runId: string | number;
};

export default function QuizRunView({ runId }: QuizRunViewProps) {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>(null);
  const [playState, setPlayState] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericRunId = useMemo(() => Number(runId), [runId]);

  const refresh = useCallback(async () => {
    try {
      const [runResult, playResult] = await Promise.all([
        quizRunService.getRunState(numericRunId),
        apiClient.get(`/quiz-play/${numericRunId}/state`).catch(() => null),
      ]);

      if (runResult.success) setState(runResult.data);
      if (playResult) setPlayState(playResult);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error cargando el quiz');
    } finally {
      setLoading(false);
    }
  }, [numericRunId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !playState?.question?.id) return;
    setSubmitting(true);
    try {
      await apiClient.post(`/quiz-run/${numericRunId}/answer`, {
        questionId: playState.question.id,
        answer: selectedAnswer,
        responseTimeMs: 1000,
      });
      setSelectedAnswer(null);
      await refresh();
    } catch (err: any) {
      setError(err.message || 'No se pudo enviar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !state) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Conectando al quiz en vivo...</Text>
      </View>
    );
  }

  const phase = state?.phase || playState?.phase || 'PRE_START';
  const question = playState?.question;
  const options = question?.answers || question?.options || [];

  return (
    <AppScreen>
      <AppHeader
        title="Quiz en vivo"
        subtitle={PHASE_LABELS[phase] || phase}
        badge={`Run #${numericRunId}`}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.body}>
        <AppCard tint="cool">
          <Text style={styles.meta}>Fase: {PHASE_LABELS[phase] || phase}</Text>
          {state?.phaseEndsAt ? (
            <Text style={styles.meta}>Tiempo restante: {new Date(state.phaseEndsAt).toLocaleTimeString()}</Text>
          ) : null}
          {state?.totalPrizeCredits != null ? (
            <Text style={styles.prize}>Bote: {state.totalPrizeCredits} créditos</Text>
          ) : null}
        </AppCard>

        {phase === 'PRE_START' ? (
          <AppCard>
            <Text style={styles.help}>Espera a que empiece la primera pregunta. Mantén la app abierta.</Text>
          </AppCard>
        ) : null}

        {question ? (
          <AppCard tint="warm">
            <Text style={styles.question}>{question.text || question.title}</Text>
            <ScrollView style={styles.options}>
              {options.map((option: any) => {
                const label = typeof option === 'string' ? option : option.text || option.label;
                const value = typeof option === 'string' ? option : option.id || option.text;
                const active = selectedAnswer === value;
                return (
                  <Pressable
                    key={String(value)}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => setSelectedAnswer(String(value))}
                    disabled={phase !== 'QUESTION_ANSWER'}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {phase === 'QUESTION_ANSWER' ? (
              <Pressable style={styles.submitBtn} onPress={handleSubmitAnswer} disabled={submitting || !selectedAnswer}>
                <Text style={styles.submitText}>{submitting ? 'Enviando...' : 'Enviar respuesta'}</Text>
              </Pressable>
            ) : null}
          </AppCard>
        ) : null}

        {phase === 'FINISHED' ? (
          <AppCard>
            <Text style={styles.help}>El quiz ha terminado. Revisa tu ranking y premios en el perfil.</Text>
          </AppCard>
        ) : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  loadingText: { marginTop: Spacing.three, color: Colors.light.textSecondary },
  body: { paddingHorizontal: Spacing.four },
  meta: { color: Colors.light.textSecondary, marginBottom: Spacing.one },
  prize: { fontSize: 18, fontWeight: '800', color: Colors.light.primary, marginTop: Spacing.one },
  help: { color: Colors.light.textSecondary, lineHeight: 22 },
  question: { fontSize: 18, fontWeight: '700', color: Colors.light.text, marginBottom: Spacing.three },
  options: { maxHeight: 280 },
  option: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    backgroundColor: '#fff',
  },
  optionActive: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EEF2FF',
  },
  optionText: { color: Colors.light.text, fontWeight: '600' },
  optionTextActive: { color: Colors.light.primary },
  submitBtn: {
    marginTop: Spacing.three,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '800' },
  error: { color: Colors.light.error, paddingHorizontal: Spacing.four, marginBottom: Spacing.two },
});
