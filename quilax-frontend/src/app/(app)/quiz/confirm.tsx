import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import CustomIcon from '@/components/CustomIcon';
import { API_BASE_URL } from '@/lib/api';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const difficulty = params.difficulty as string;
  const date = params.date as string;
  const questionsCount = params.questionsCount as string;
  const [canMessageAdmin, setCanMessageAdmin] = useState(false);
  const [adminMessageReason, setAdminMessageReason] = useState('');

  useEffect(() => {
    checkAdminMessagingPermission();
  }, []);

  const checkAdminMessagingPermission = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-quizzes/can-message-admin`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setCanMessageAdmin(data.canMessage);
      setAdminMessageReason(data.reason);
    } catch (error) {
      console.error('Error checking admin messaging permission:', error);
    }
  };

  const handleConfirm = () => {
    Alert.alert('Quiz Enviado', 'Tu quiz ha sido enviado a revisión correctamente.');
    router.push('/(app)/home');
  };

  const handleMessageAdmin = () => {
    Alert.alert('Mensaje a Admin', 'Función de mensajes a admin habilitada por 72 horas.');
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <CustomIcon name="back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Enviar Quiz</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.confirmationCard}>
          <CustomIcon name="check" size={48} color={Colors.light.gradientStart} />
          <Text style={styles.confirmationTitle}>¡Quiz listo para enviar!</Text>
          <Text style={styles.confirmationText}>
            Tu quiz ha sido configurado correctamente y está listo para ser enviado a revisión.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <CustomIcon name="rules" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>Dificultad: {difficulty || 'No seleccionada'}</Text>
          </View>
          <View style={styles.infoItem}>
            <CustomIcon name="time" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>Fecha: {date || 'No programada'}</Text>
          </View>
          <View style={styles.infoItem}>
            <CustomIcon name="edit" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>Preguntas: {questionsCount || '0'}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Enviar quiz a revisión</Text>
          </Pressable>
          <Text style={styles.disclaimerText}>
            Una vez mandado a revisión, tu quiz podrá ser publicado o rechazado.
          </Text>
          {canMessageAdmin && (
            <Pressable
              style={styles.adminMessageButton}
              onPress={handleMessageAdmin}
            >
              <CustomIcon name="message" size={16} color="#FFFFFF" />
              <Text style={styles.adminMessageButtonText}>Enviar mensaje a admin</Text>
              <Text style={styles.adminMessageReasonText}>({adminMessageReason})</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  gradientHeader: {
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  backButton: {
    padding: Spacing.two,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.four,
  },
  confirmationCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  confirmationText: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.six,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  infoText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  buttonContainer: {
    marginTop: Spacing.four,
  },
  confirmButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerText: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  adminMessageButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  adminMessageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  adminMessageReasonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
