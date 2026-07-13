import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface PositionRule {
  fromPosition: number;
  toPosition: number;
  percentage: number;
}

interface QuizDistribution {
  adminJackpotPercentage: number;
  adminProfitPercentage: number;
  creatorPercentage: number;
  positionRules: PositionRule[];
}

export default function QuizDistributionScreen() {
  const router = useRouter();
  const [distribution, setDistribution] = useState<QuizDistribution>({
    adminJackpotPercentage: 5,
    adminProfitPercentage: 5,
    creatorPercentage: 10,
    positionRules: [
      { fromPosition: 1, toPosition: 1, percentage: 40 },
      { fromPosition: 2, toPosition: 2, percentage: 25 },
      { fromPosition: 3, toPosition: 3, percentage: 15 },
      { fromPosition: 4, toPosition: 4, percentage: 5 },
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentDistribution();
  }, []);

  const loadCurrentDistribution = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/prize-config/config`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.config.quizDistribution) {
        setDistribution(data.config.quizDistribution);
      }
    } catch (error) {
      console.error('Error loading distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = distribution.adminJackpotPercentage + 
                        distribution.adminProfitPercentage +
                        distribution.creatorPercentage + 
                        distribution.positionRules.reduce((sum, rule) => sum + rule.percentage, 0);

  const canSave = Math.abs(totalPercentage - 100) < 0.1;

  const handlePercentageChange = (field: keyof QuizDistribution, value: string) => {
    const numValue = parseFloat(value) || 0;
    setDistribution(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handlePositionRuleChange = (index: number, field: keyof PositionRule, value: string) => {
    const numValue = parseFloat(value) || 0;
    setDistribution(prev => ({
      ...prev,
      positionRules: prev.positionRules.map((rule, i) => 
        i === index ? { ...rule, [field]: numValue } : rule
      )
    }));
  };

  const handleAddPosition = () => {
    const lastRule = distribution.positionRules[distribution.positionRules.length - 1];
    const nextFromPosition = lastRule ? lastRule.toPosition + 1 : 1;
    setDistribution(prev => ({
      ...prev,
      positionRules: [...prev.positionRules, { fromPosition: nextFromPosition, toPosition: nextFromPosition, percentage: 0 }]
    }));
  };

  const handleRemovePosition = (index: number) => {
    setDistribution(prev => ({
      ...prev,
      positionRules: prev.positionRules.filter((_, i) => i !== index)
    }));
  };

  const calculateIndividualPercentage = (rule: PositionRule) => {
    const count = rule.toPosition - rule.fromPosition + 1;
    if (count <= 0) return 0;
    return (rule.percentage / count).toFixed(2);
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Error', 'El reparto debe sumar exactamente 100%');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/prize-config/quiz-distribution`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quizDistribution: distribution }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Éxito', data.message);
      } else {
        Alert.alert('Error', data.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving distribution:', error);
      Alert.alert('Error', 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <CustomIcon name="back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Reparto de Quizzes</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Configura el reparto de premios para TODOS los quizzes. Los cambios se aplicarán a todos los quizzes futuros.
        </Text>

        {/* Barra de progreso total */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Total del reparto: {totalPercentage.toFixed(1)}%</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${Math.min(totalPercentage, 100)}%` },
                canSave ? styles.progressValid : styles.progressInvalid
              ]} 
            />
          </View>
          <Text style={[
            styles.progressStatus,
            canSave ? styles.statusValid : styles.statusInvalid
          ]}>
            {canSave ? '✓ Reparto válido (100%)' : `✗ Faltan ${(100 - totalPercentage).toFixed(1)}%`}
          </Text>
        </View>

        {/* Admin Jackpot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jackpot del Admin</Text>
          <Text style={styles.sectionDescription}>Se va a la cuenta jackpot administrada por admin (para premios de temporada)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.percentageInput}
              value={distribution.adminJackpotPercentage.toString()}
              onChangeText={(value) => handlePercentageChange('adminJackpotPercentage', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
        </View>

        {/* Admin Profit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beneficios del Admin</Text>
          <Text style={styles.sectionDescription}>Se va a la cuenta principal de admin (beneficios del juego)</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.percentageInput}
              value={distribution.adminProfitPercentage.toString()}
              onChangeText={(value) => handlePercentageChange('adminProfitPercentage', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
        </View>

        {/* Creador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Creador del Quiz</Text>
          <Text style={styles.sectionDescription}>Se va a la cuenta del creador del quiz</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.percentageInput}
              value={distribution.creatorPercentage.toString()}
              onChangeText={(value) => handlePercentageChange('creatorPercentage', value)}
              keyboardType="decimal-pad"
            />
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
        </View>

        {/* Posiciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reparto por Posición</Text>

          {distribution.positionRules.map((rule, index) => (
            <View key={index}>
              <View style={styles.positionRow}>
                <View style={styles.positionRangeContainer}>
                  <Text style={styles.positionLabel}>Desde:</Text>
                  <TextInput
                    style={styles.positionInput}
                    value={rule.fromPosition.toString()}
                    onChangeText={(value) => handlePositionRuleChange(index, 'fromPosition', value)}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.positionLabel}>Hasta:</Text>
                  <TextInput
                    style={styles.positionInput}
                    value={rule.toPosition.toString()}
                    onChangeText={(value) => handlePositionRuleChange(index, 'toPosition', value)}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.percentageInput}
                    value={rule.percentage.toString()}
                    onChangeText={(value) => handlePositionRuleChange(index, 'percentage', value)}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.percentageSymbol}>%</Text>
                </View>
                <Pressable 
                  style={styles.removeButton} 
                  onPress={() => handleRemovePosition(index)}
                >
                  <CustomIcon name="close" size={20} color={Colors.light.error} />
                </Pressable>
              </View>
              {rule.fromPosition !== rule.toPosition && (
                <Text style={styles.individualPercentageText}>
                  Cada uno: {calculateIndividualPercentage(rule)}%
                </Text>
              )}
            </View>
          ))}

          <Pressable style={styles.addButton} onPress={handleAddPosition}>
            <CustomIcon name="plus" size={20} color={Colors.light.text} />
            <Text style={styles.addButtonText}>Añadir rango de posiciones</Text>
          </Pressable>
        </View>

        {/* Botón Guardar */}
        <Pressable
          style={[styles.saveButton, !canSave && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Text>
        </Pressable>

        <Text style={styles.warningText}>
          ⚠️ Los cambios se aplicarán a TODOS los quizzes futuros
        </Text>

        <Text style={styles.redistributionText}>
          ℹ️ Si en un quiz no hay suficientes jugadores para cubrir todas las posiciones premiadas, la cantidad del porcentaje programada para los jugadores faltantes se reparte en partes iguales entre el jugador en primer lugar y el creador del quiz.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 50,
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
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.four,
    lineHeight: 24,
  },
  progressContainer: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.four,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  progressBar: {
    height: 24,
    backgroundColor: '#e5e5e5',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  progressValid: {
    backgroundColor: Colors.light.success,
  },
  progressInvalid: {
    backgroundColor: Colors.light.error,
  },
  progressStatus: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusValid: {
    color: Colors.light.success,
  },
  statusInvalid: {
    color: Colors.light.error,
  },
  section: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.three,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  percentageInput: {
    width: 100,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  percentageSymbol: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  positionRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flex: 1,
  },
  positionInput: {
    width: 60,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  positionLabel: {
    fontSize: 14,
    color: Colors.light.text,
  },
  individualPercentageText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: Spacing.two,
    marginLeft: Spacing.four,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.three,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.two,
  },
  saveButton: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  warningText: {
    fontSize: 14,
    color: Colors.light.error,
    textAlign: 'center',
    marginTop: Spacing.three,
    fontWeight: '600',
  },
  redistributionText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.three,
    lineHeight: 20,
    paddingHorizontal: Spacing.four,
  },
});
