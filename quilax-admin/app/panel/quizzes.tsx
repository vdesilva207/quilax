import { ScrollView, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AdminQuizCalendar from '@/components/AdminQuizCalendar';

export default function AdminQuizzesScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
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
});
