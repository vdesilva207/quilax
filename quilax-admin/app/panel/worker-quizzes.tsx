import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface Quiz {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  creator: {
    id: number;
    username: string;
    email: string;
  };
  _count: {
    quizRuns: number;
  };
}

export default function WorkerQuizzesScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, [statusFilter]);

  const fetchQuizzes = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = statusFilter 
        ? `${API_BASE_URL}/admin/worker/quizzes?status=${statusFilter}`
        : `${API_BASE_URL}/admin/worker/quizzes`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      Alert.alert('Error', 'Error al cargar quizzes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return Colors.light.primary;
      case 'PENDING': return Colors.light.error;
      case 'REJECTED': return Colors.light.textSecondary;
      default: return Colors.light.backgroundSelected;
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
        <View style={styles.headerContent}>
          <Text style={styles.title}>Quizzes</Text>
          <Text style={styles.subtitle}>Gestión de quizzes</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Filtrar por estado:</Text>
          <View style={styles.filterButtons}>
            <Pressable
              style={[styles.filterButton, !statusFilter && styles.activeFilter]}
              onPress={() => setStatusFilter('')}
            >
              <Text style={styles.filterButtonText}>Todos</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, statusFilter === 'PENDING' && styles.activeFilter]}
              onPress={() => setStatusFilter('PENDING')}
            >
              <Text style={styles.filterButtonText}>Pendientes</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, statusFilter === 'PUBLISHED' && styles.activeFilter]}
              onPress={() => setStatusFilter('PUBLISHED')}
            >
              <Text style={styles.filterButtonText}>Publicados</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, statusFilter === 'REJECTED' && styles.activeFilter]}
              onPress={() => setStatusFilter('REJECTED')}
            >
              <Text style={styles.filterButtonText}>Rechazados</Text>
            </Pressable>
          </View>
        </View>

        {quizzes.map((quiz) => (
          <View key={quiz.id} style={styles.quizCard}>
            <View style={styles.quizHeader}>
              <Text style={styles.quizTitle}>{quiz.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(quiz.status) }]}>
                <Text style={styles.statusText}>{quiz.status}</Text>
              </View>
            </View>

            <View style={styles.quizInfo}>
              <Text style={styles.infoLabel}>Creador:</Text>
              <Text style={styles.infoValue}>{quiz.creator.username}</Text>
            </View>

            <View style={styles.quizInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{quiz.creator.email}</Text>
            </View>

            <View style={styles.quizInfo}>
              <Text style={styles.infoLabel}>Jugado:</Text>
              <Text style={styles.infoValue}>{quiz._count.quizRuns} veces</Text>
            </View>

            <View style={styles.quizInfo}>
              <Text style={styles.infoLabel}>Creado:</Text>
              <Text style={styles.infoValue}>{formatDate(quiz.createdAt)}</Text>
            </View>
          </View>
        ))}

        {quizzes.length === 0 && (
          <Text style={styles.emptyText}>No hay quizzes para mostrar</Text>
        )}
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
  filters: {
    gap: Spacing.two,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  activeFilter: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  quizCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
    marginLeft: Spacing.two,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
