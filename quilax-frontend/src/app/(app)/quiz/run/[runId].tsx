import { useLocalSearchParams } from 'expo-router';
import QuizRunView from '@/components/quiz/QuizRunView';

export default function QuizRunScreen() {
  const { runId } = useLocalSearchParams<{ runId: string }>();
  return <QuizRunView runId={runId} />;
}
