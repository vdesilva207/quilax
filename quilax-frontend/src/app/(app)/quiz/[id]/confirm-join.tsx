import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Spacing } from '@/constants/theme';
import QuizEnrollModal from '@/components/quiz/QuizEnrollModal';
import quizRunService from '@/services/quizRunService';

export default function ConfirmJoinScreen() {
  const { id, runId } = useLocalSearchParams<{ id: string; runId?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!runId) return;
    setLoading(true);
    const result = await quizRunService.joinQuiz(runId);
    setLoading(false);
    if (result.success) {
      router.replace(`/(app)/quiz/run/${runId}`);
      return;
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <QuizEnrollModal
        visible
        quizTitle={`Quiz #${id}`}
        entryCost={1}
        loading={loading}
        onCancel={() => router.back()}
        onConfirm={handleConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
});
