import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

export default function QuizDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [prizeDistribution, setPrizeDistribution] = useState({
    first: 50,
    second: 30,
    third: 15,
    fourth: 5,
  });
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const totalPercentage = Object.values(prizeDistribution).reduce((sum, val) => sum + val, 0);

  const handleDistributionChange = (position: keyof typeof prizeDistribution, value: string) => {
    const numValue = parseInt(value) || 0;
    setPrizeDistribution(prev => ({
      ...prev,
      [position]: numValue,
    }));
  };

  const handlePublish = async () => {
    if (totalPercentage !== 100) {
      Alert.alert('Error', 'El reparto del premio debe sumar exactamente 100%');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Error', 'Debes programar una fecha y hora para el quiz');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/admin/quizzes/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prizeDistribution,
          scheduledDate: `${scheduledDate}T${scheduledTime}`,
        }),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Quiz publicado exitosamente');
        router.back();
      } else {
        Alert.alert('Error', 'No se pudo publicar el quiz');
      }
    } catch (error) {
      console.error('Error publishing quiz:', error);
      Alert.alert('Error', 'Error al publicar el quiz');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Detalle del Quiz</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Quiz</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ID del Quiz:</Text>
            <Text style={styles.infoValue}>{id}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reparto del Premio</Text>
          <Text style={styles.sectionDescription}>
            Configura el porcentaje de premio para cada posición (debe sumar 100%)
          </Text>

          <View style={styles.distributionContainer}>
            <View style={styles.distributionRow}>
              <Text style={styles.positionLabel}>1º Lugar:</Text>
              <TextInput
                style={styles.percentageInput}
                value={prizeDistribution.first.toString()}
                onChangeText={(value) => handleDistributionChange('first', value)}
                keyboardType="numeric"
                placeholder="%"
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>

            <View style={styles.distributionRow}>
              <Text style={styles.positionLabel}>2º Lugar:</Text>
              <TextInput
                style={styles.percentageInput}
                value={prizeDistribution.second.toString()}
                onChangeText={(value) => handleDistributionChange('second', value)}
                keyboardType="numeric"
                placeholder="%"
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>

            <View style={styles.distributionRow}>
              <Text style={styles.positionLabel}>3º Lugar:</Text>
              <TextInput
                style={styles.percentageInput}
                value={prizeDistribution.third.toString()}
                onChangeText={(value) => handleDistributionChange('third', value)}
                keyboardType="numeric"
                placeholder="%"
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>

            <View style={styles.distributionRow}>
              <Text style={styles.positionLabel}>4º Lugar:</Text>
              <TextInput
                style={styles.percentageInput}
                value={prizeDistribution.fourth.toString()}
                onChangeText={(value) => handleDistributionChange('fourth', value)}
                keyboardType="numeric"
                placeholder="%"
              />
              <Text style={styles.percentageSymbol}>%</Text>
            </View>
          </View>

          <View style={[
            styles.totalContainer,
            totalPercentage === 100 ? styles.totalValid : styles.totalInvalid
          ]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{totalPercentage}%</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Programar Fecha y Hora</Text>
          <Text style={styles.sectionDescription}>
            Selecciona cuándo se realizará el quiz (solo un quiz por minuto)
          </Text>

          <View style={styles.scheduleContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.dateInput}
                value={scheduledDate}
                onChangeText={setScheduledDate}
                placeholder="2024-01-15"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hora (HH:MM):</Text>
              <TextInput
                style={styles.dateInput}
                value={scheduledTime}
                onChangeText={setScheduledTime}
                placeholder="20:00"
              />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[
              styles.publishButton,
              (totalPercentage !== 100 || !scheduledDate || !scheduledTime) && styles.buttonDisabled
            ]}
            onPress={handlePublish}
            disabled={totalPercentage !== 100 || !scheduledDate || !scheduledTime}
          >
            <Text style={styles.publishButtonText}>Publicar Quiz</Text>
          </Pressable>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    backgroundColor: Colors.light.backgroundElement,
    gap: Spacing.three,
  },
  backButton: {
    padding: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  content: {
    padding: Spacing.four,
  },
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  distributionContainer: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  positionLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  percentageInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  percentageSymbol: {
    marginLeft: Spacing.one,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: 8,
    marginBottom: Spacing.three,
  },
  totalValid: {
    backgroundColor: Colors.light.success,
  },
  totalInvalid: {
    backgroundColor: Colors.light.error,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scheduleContainer: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 8,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  dateInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  actions: {
    marginTop: Spacing.four,
  },
  publishButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
