import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import adminService from '@/services/adminService';
import { AppCard, AppSection } from '@/components/ui/AppScreen';

function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const quizId = Number(id);

  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [creatorMessage, setCreatorMessage] = useState('');

  const showFeedback = (type: 'ok' | 'err', text: string) => {
    setActionFeedback({ type, text });
    // Alert en web de Expo a menudo no muestra nada; window.alert sí.
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(text);
    } else {
      Alert.alert(type === 'ok' ? 'Éxito' : 'Error', text);
    }
  };

  const loadQuiz = useCallback(async () => {
    if (!quizId) {
      setError('ID de quiz inválido');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const result = await adminService.getQuizById(quizId);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error || 'No se pudo cargar el quiz');
      setQuiz(null);
      return;
    }
    setQuiz(result.data);
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const scheduledAt = useMemo(() => {
    return quiz?.schedules?.[0]?.scheduledAt || quiz?.requestedDate || null;
  }, [quiz]);

  const totalReadSec = useMemo(() => {
    if (!quiz?.questions?.length) return 0;
    return quiz.questions.reduce((sum: number, q: any) => sum + (Number(q.readTime) || 0), 0);
  }, [quiz]);

  const totalAnswerSec = useMemo(() => {
    if (!quiz?.questions?.length) return 0;
    return quiz.questions.reduce((sum: number, q: any) => sum + (Number(q.answerTime) || 0), 0);
  }, [quiz]);

  const isPending = quiz?.status === 'PENDING_REVIEW';

  const handleApprove = async () => {
    if (!quizId) return;
    setActionLoading(true);
    setActionFeedback(null);
    const result = await adminService.approveQuiz(
      quizId,
      scheduledAt,
      creatorMessage.trim() || undefined,
    );
    setActionLoading(false);
    if (result.success) {
      showFeedback('ok', 'Quiz aprobado');
      router.replace('/panel/quizzes');
    } else {
      showFeedback('err', result.error || 'No se pudo aprobar');
    }
  };

  const handleReject = async () => {
    if (!quizId) return;
    setActionLoading(true);
    setActionFeedback(null);
    const result = await adminService.rejectQuiz(
      quizId,
      creatorMessage.trim() || 'Rechazado por admin tras revisión',
    );
    setActionLoading(false);
    if (result.success) {
      showFeedback('ok', 'Quiz rechazado. La fecha queda libre.');
      router.replace('/panel/quizzes');
    } else {
      showFeedback('err', result.error || 'No se pudo rechazar');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Cargando quiz completo…</Text>
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Quiz no encontrado'}</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Revisión del quiz</Text>
          <Text style={styles.subtitle}>ID {quiz.id} · {quiz.status}</Text>
        </View>
      </View>

      {quiz.coverImage ? (
        <Image source={{ uri: quiz.coverImage }} style={styles.cover} resizeMode="cover" />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverPlaceholderText}>Sin foto de portada</Text>
        </View>
      )}

      <AppSection title="Información general" accentIndex={0}>
        <AppCard>
          <Text style={styles.quizTitle}>{quiz.title || 'Sin título'}</Text>
          <Text style={styles.meta}>Categoría: {quiz.category || '—'}</Text>
          <Text style={styles.meta}>Dificultad: {quiz.difficulty ?? '—'}/10</Text>
          <Text style={styles.meta}>Entrada: 1 crédito (fijo)</Text>
          {quiz.reviewedBy === 'AI' || quiz.aiReviewStatus ? (
            <Text style={styles.meta}>
              Revisión app: {quiz.aiReviewStatus || '—'}
              {quiz.reviewedBy ? ` (${quiz.reviewedBy})` : ''}
              {quiz.aiReviewStatus === 'NEEDS_HUMAN'
                ? ' — la IA no pudo cerrarlo sola; revisa manualmente'
                : ''}
            </Text>
          ) : null}
          {quiz.aiReviewReason ? (
            <Text style={styles.aiReason}>Motivo IA: {quiz.aiReviewReason}</Text>
          ) : null}
          {quiz.status === 'FINISHED' ? (
            <Text style={styles.meta}>
              Prize pool repartido: {quiz.totalPrizeDistributed ?? 0} créditos
            </Text>
          ) : (
            <Text style={styles.meta}>
              Inscritos: {quiz.enrollmentCount ?? 0} · Bote estimado:{' '}
              {(quiz.enrollmentCount ?? 0)} créditos
            </Text>
          )}
          <Text style={styles.meta}>Fecha solicitada: {formatDateTime(quiz.requestedDate)}</Text>
          <Text style={styles.meta}>Programado: {formatDateTime(scheduledAt)}</Text>
          <Text style={styles.meta}>
            Creador: {quiz.creator?.username || quiz.creator?.fullName || '—'} ({quiz.creator?.email || '—'})
          </Text>
        </AppCard>
      </AppSection>

      <AppSection title="Del creador" accentIndex={1}>
        <AppCard>
          <Text style={styles.blockLabel}>Descripción</Text>
          <Text style={styles.blockBody}>{quiz.description?.trim() || 'Sin descripción'}</Text>
          <Text style={[styles.blockLabel, styles.blockSpacer]}>Recomendaciones / tips</Text>
          <Text style={styles.blockBody}>{quiz.tips?.trim() || 'Sin recomendaciones'}</Text>
        </AppCard>
      </AppSection>

      <AppSection title="Tiempos" accentIndex={2}>
        <AppCard>
          <Text style={styles.meta}>Preguntas: {quiz.questions?.length ?? 0}</Text>
          <Text style={styles.meta}>Tiempo total lectura: {totalReadSec}s</Text>
          <Text style={styles.meta}>Tiempo total respuesta: {totalAnswerSec}s</Text>
          <Text style={styles.meta}>Duración estimada: {totalReadSec + totalAnswerSec}s</Text>
        </AppCard>
      </AppSection>

      <AppSection title="Preguntas" accentIndex={3}>
        {(quiz.questions || []).length === 0 ? (
          <AppCard>
            <Text style={styles.blockBody}>Este quiz no tiene preguntas.</Text>
          </AppCard>
        ) : (
          (quiz.questions || []).map((q: any, index: number) => (
            <AppCard key={q.id || index} style={styles.questionCard}>
              <Text style={styles.questionIndex}>Pregunta {index + 1}</Text>
              <Text style={styles.questionText}>{q.text}</Text>
              <Text style={styles.meta}>
                Lectura {q.readTime}s · Respuesta {q.answerTime}s · Máx. {q.maxPoints} pts
              </Text>
              <View style={styles.answersWrap}>
                {(q.answers || [])
                  .filter((a: any) => a.userId == null)
                  .map((a: any) => (
                  <View
                    key={a.id}
                    style={[styles.answerRow, a.isCorrect && styles.answerCorrect]}
                  >
                    <Text style={[styles.answerText, a.isCorrect && styles.answerTextCorrect]}>
                      {a.isCorrect ? '✓ ' : '• '}
                      {a.text}
                    </Text>
                  </View>
                ))}
                {(q.answers || []).filter((a: any) => a.userId == null).length === 0 ? (
                  <Text style={styles.meta}>Sin opciones registradas</Text>
                ) : null}
              </View>
            </AppCard>
          ))
        )}
      </AppSection>

      {actionFeedback ? (
        <AppCard>
          <Text
            style={[
              styles.feedbackText,
              actionFeedback.type === 'ok' ? styles.feedbackOk : styles.feedbackErr,
            ]}
          >
            {actionFeedback.text}
          </Text>
        </AppCard>
      ) : null}

      {isPending ? (
        <AppSection title="Decisión" accentIndex={0}>
          <AppCard>
            <Text style={styles.blockLabel}>Mensaje al creador (opcional)</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={4}
              placeholder="Ej.: Bien el temario. Cambia la pregunta 3 porque es ambigua…"
              placeholderTextColor={Colors.light.textSecondary}
              value={creatorMessage}
              onChangeText={setCreatorMessage}
              editable={!actionLoading}
            />
            <Text style={styles.meta}>
              Si lo rellenas, el creador lo recibe junto con la notificación de aprobado/rechazado.
            </Text>
          </AppCard>
          <View style={styles.actions}>
            <Pressable
              style={[styles.approveButton, actionLoading && styles.buttonDisabled]}
              onPress={handleApprove}
              disabled={actionLoading}
            >
              <Text style={styles.actionText}>Aprobar</Text>
            </Pressable>
            <Pressable
              style={[styles.rejectButton, actionLoading && styles.buttonDisabled]}
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Text style={styles.actionText}>Rechazar</Text>
            </Pressable>
          </View>
        </AppSection>
      ) : quiz.status === 'REJECTED' ? (
        <AppSection title="Denegado — mensaje al creador" accentIndex={3}>
          <AppCard>
            {quiz.aiReviewReason ? (
              <Text style={styles.aiReason}>La app denegó este quiz: {quiz.aiReviewReason}</Text>
            ) : (
              <Text style={styles.blockBody}>Este quiz está denegado.</Text>
            )}
            <Text style={styles.blockLabel}>Mensaje adicional al creador</Text>
            <TextInput
              style={styles.messageInput}
              multiline
              numberOfLines={4}
              placeholder="Explica al creador qué debe corregir…"
              placeholderTextColor={Colors.light.textSecondary}
              value={creatorMessage}
              onChangeText={setCreatorMessage}
              editable={!actionLoading}
            />
            <Pressable
              style={[styles.rejectButton, actionLoading && styles.buttonDisabled, { marginTop: 12 }]}
              disabled={actionLoading || !creatorMessage.trim()}
              onPress={async () => {
                if (!quizId || !creatorMessage.trim()) return;
                setActionLoading(true);
                try {
                  const result = await adminService.notifyQuizCreator(
                    quizId,
                    creatorMessage.trim(),
                  );
                  if (result.success) {
                    showFeedback('ok', 'Mensaje enviado al creador');
                    setCreatorMessage('');
                  } else {
                    showFeedback('err', result.error || 'No se pudo enviar');
                  }
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Text style={styles.actionText}>Enviar mensaje</Text>
            </Pressable>
          </AppCard>
        </AppSection>
      ) : (
        <AppCard>
          <Text style={styles.blockBody}>
            Este quiz ya está en estado {quiz.status}. Solo se pueden aprobar/rechazar los pendientes de revisión.
          </Text>
        </AppCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingBottom: Spacing.six },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.background,
    gap: Spacing.three,
  },
  loadingText: { color: Colors.light.textSecondary },
  errorText: { color: Colors.light.error, fontWeight: '700', textAlign: 'center' },
  backLink: { padding: Spacing.three },
  backLinkText: { color: Colors.light.primary, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
  },
  backButton: { padding: Spacing.two },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  cover: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.light.backgroundSelected,
  },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { color: Colors.light.textSecondary },
  quizTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  meta: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  aiReason: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '700',
    marginBottom: Spacing.two,
    marginTop: Spacing.one,
  },
  blockLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockSpacer: { marginTop: Spacing.three },
  blockBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.text,
  },
  questionCard: { marginBottom: Spacing.two },
  questionIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: Spacing.one,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  answersWrap: { marginTop: Spacing.two, gap: Spacing.one },
  answerRow: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSelected,
  },
  answerCorrect: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderWidth: 1,
    borderColor: Colors.light.success,
  },
  answerText: { fontSize: 14, color: Colors.light.text },
  answerTextCorrect: { fontWeight: '700', color: '#166534' },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  approveButton: {
    flex: 1,
    backgroundColor: Colors.light.success,
    paddingVertical: Spacing.three,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: Colors.light.error,
    paddingVertical: Spacing.three,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  messageInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 10,
    padding: Spacing.three,
    fontSize: 15,
    color: Colors.light.text,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    marginBottom: Spacing.two,
  },
  feedbackText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedbackOk: { color: Colors.light.success },
  feedbackErr: { color: Colors.light.error },
});
