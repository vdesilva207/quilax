import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';
import CustomIcon from '@/components/CustomIcon';

interface JackpotEntry {
  id: number;
  amount: number;
  source: string;
  description: string;
  createdAt: string;
  quizId?: number;
  quizTitle?: string;
}

export default function JackpotHistoryScreen() {
  const router = useRouter();
  const [jackpotHistory, setJackpotHistory] = useState<JackpotEntry[]>([]);
  const [totalJackpot, setTotalJackpot] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJackpotHistory();
  }, []);

  const loadJackpotHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      // Cargar historial de jackpot
      const response = await fetch(`${API_BASE_URL}/admin/jackpot/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setJackpotHistory(data.history || []);
        setTotalJackpot(data.totalJackpot || 0);
      }
    } catch (error) {
      console.error('Error loading jackpot history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'QUIZ': return 'quiz';
      case 'SEASON': return 'trophy';
      case 'ADMIN': return 'admin';
      default: return 'coins';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <CustomIcon name="back" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Historial del Jackpot</Text>
          <Text style={styles.subtitle}>Cuenta del Jackpot</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Balance del Jackpot */}
        <View style={[styles.balanceSection, styles.coralSection]}>
          <Text style={styles.balanceLabel}>Balance Actual del Jackpot</Text>
          <Text style={styles.balanceValue}>{totalJackpot} créditos</Text>
          <Text style={styles.balanceEquivalent}>≈ €{totalJackpot.toFixed(2)}</Text>
        </View>

        {/* Historial de Ingresos */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Historial de Ingresos</Text>
          {jackpotHistory.length > 0 ? (
            jackpotHistory.map((entry) => (
              <View key={entry.id} style={[styles.historyCard, styles.coralCard]}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyIconContainer}>
                    <CustomIcon name={getSourceIcon(entry.source)} size={24} color="#FF7F50" />
                  </View>
                  <View style={styles.historyHeaderInfo}>
                    <Text style={styles.historySource}>{entry.source}</Text>
                    <Text style={styles.historyDate}>{formatDate(entry.createdAt)}</Text>
                  </View>
                  <View style={styles.historyAmountContainer}>
                    <Text style={[styles.historyAmount, styles.coralAmount]}>+{entry.amount} créditos</Text>
                  </View>
                </View>

                {entry.description && (
                  <Text style={styles.historyDescription}>{entry.description}</Text>
                )}

                {entry.quizTitle && (
                  <View style={styles.quizInfo}>
                    <Text style={styles.quizInfoLabel}>Quiz:</Text>
                    <Text style={styles.quizInfoValue}>{entry.quizTitle}</Text>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>No hay historial de ingresos del jackpot</Text>
            </View>
          )}
        </View>

        {/* Resumen por Fuente */}
        <View style={[styles.summarySection, styles.coralSection]}>
          <Text style={styles.sectionTitle}>Resumen por Fuente</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total de Quizzes</Text>
            <Text style={[styles.summaryValue, styles.coralValue]}>
              {jackpotHistory.filter(h => h.source === 'QUIZ').reduce((sum, h) => sum + h.amount, 0)} créditos
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total de Temporadas</Text>
            <Text style={[styles.summaryValue, styles.coralValue]}>
              {jackpotHistory.filter(h => h.source === 'SEASON').reduce((sum, h) => sum + h.amount, 0)} créditos
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Otros Ingresos</Text>
            <Text style={[styles.summaryValue, styles.coralValue]}>
              {jackpotHistory.filter(h => h.source !== 'QUIZ' && h.source !== 'SEASON').reduce((sum, h) => sum + h.amount, 0)} créditos
            </Text>
          </View>
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
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: Spacing.six,
    top: Spacing.six,
    padding: Spacing.two,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: Spacing.one,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    padding: Spacing.six,
    gap: Spacing.four,
  },
  balanceSection: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
  },
  coralSection: {
    borderWidth: 2,
    borderColor: '#FF7F50',
  },
  balanceLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF7F50',
  },
  balanceEquivalent: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  historySection: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  historyCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  coralCard: {
    borderWidth: 2,
    borderColor: '#FF7F50',
    borderLeftWidth: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 127, 80, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  historyHeaderInfo: {
    flex: 1,
  },
  historySource: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  historyAmountContainer: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  coralAmount: {
    color: '#FF7F50',
  },
  historyDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 8,
  },
  quizInfoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  quizInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  placeholder: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 200,
  },
  placeholderText: {
    color: Colors.light.textSecondary,
    fontSize: 16,
  },
  summarySection: {
    gap: Spacing.three,
  },
  summaryCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  coralValue: {
    color: '#FF7F50',
  },
});
