import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import AdminQuizCalendar from '@/components/AdminQuizCalendar';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

export default function AdminQuizzesScreen() {
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  const handleQuizSelect = (quiz: any) => {
    setSelectedQuiz(quiz);
  };

  const handleApprove = async () => {
    if (!selectedQuiz) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quizzes/${selectedQuiz.quizId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        Alert.alert('Éxito', 'Quiz aprobado exitosamente');
        setSelectedQuiz(null);
      }
    } catch (error) {
      console.error('Error approving quiz:', error);
      Alert.alert('Error', 'Error al aprobar quiz');
    }
  };

  const handleReject = async () => {
    if (!selectedQuiz) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/quizzes/${selectedQuiz.quizId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'Rechazado por admin' }),
      });
      if (response.ok) {
        Alert.alert('Éxito', 'Quiz rechazado exitosamente');
        setSelectedQuiz(null);
      }
    } catch (error) {
      console.error('Error rejecting quiz:', error);
      Alert.alert('Error', 'Error al rechazar quiz');
    }
  };

  const isPendingReview =
    selectedQuiz?.status === 'PENDING' ||
    selectedQuiz?.rawStatus === 'PENDING_REVIEW';

  return (
    <ScrollView style={styles.container}>
      <AdminQuizCalendar onQuizSelect={handleQuizSelect} />

      {selectedQuiz && (
        <View style={styles.selectedQuizSection}>
          <Text style={styles.sectionTitle}>Quiz Seleccionado</Text>
          <View style={styles.quizCard}>
            <Text style={styles.quizTitle}>{selectedQuiz.quizTitle || 'Sin título'}</Text>
            <Text style={styles.quizStatus}>Estado: {selectedQuiz.rawStatus ?? selectedQuiz.status}</Text>
            <Text style={styles.quizId}>ID: {selectedQuiz.quizId}</Text>
            <View style={styles.quizActions}>
              <Pressable 
                style={[styles.approveButton, !isPendingReview && styles.buttonDisabled]} 
                onPress={handleApprove}
                disabled={!isPendingReview}
              >
                <Text style={styles.approveButtonText}>Aprobar</Text>
              </Pressable>
              <Pressable 
                style={[styles.rejectButton, !isPendingReview && styles.buttonDisabled]} 
                onPress={handleReject}
                disabled={!isPendingReview}
              >
                <Text style={styles.rejectButtonText}>Rechazar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  quizCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  quizCreator: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  quizDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  quizParticipants: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
    marginBottom: Spacing.three,
  },
  quizActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  detailButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: Colors.light.success,
    padding: Spacing.three,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
    padding: Spacing.three,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedQuizSection: {
    padding: Spacing.four,
    marginTop: Spacing.two,
  },
  quizStatus: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  quizId: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
