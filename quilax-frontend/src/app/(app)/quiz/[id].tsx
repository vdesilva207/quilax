import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import quizRunService from '@/services/quizRunService';

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    quizRunService.getQuizInfo(id).then((result) => {
      if (result.success) setQuiz(result.data);
      else setError(result.error || 'No se pudo cargar el quiz');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <AppScreen>
        <AppHeader title="Quiz" subtitle={error || 'No encontrado'} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader title={quiz.title} subtitle={quiz.category || 'Quiz en vivo'} badge={`${quiz._count?.questions || 0} preguntas`} />
      <View style={styles.body}>
        <AppCard>
          <Text style={styles.description}>{quiz.description || 'Sin descripción'}</Text>
          {quiz.tips ? <Text style={styles.tips}>Tips: {quiz.tips}</Text> : null}
          {quiz.difficulty ? <Text style={styles.meta}>Dificultad: {quiz.difficulty}/10</Text> : null}
        </AppCard>
        <Pressable
          style={styles.joinBtn}
          onPress={() => router.push(`/(app)/quiz/${id}/join`)}
        >
          <Text style={styles.joinText}>Unirse al quiz</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.four },
  description: { color: Colors.light.text, lineHeight: 22 },
  tips: { marginTop: Spacing.two, color: Colors.light.textSecondary },
  meta: { marginTop: Spacing.two, fontWeight: '700', color: Colors.light.primary },
  joinBtn: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  joinText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
