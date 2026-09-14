import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface Withdrawal {
  id: number;
  amount: number;
  status: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function WorkerWithdrawalsScreen() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const fetchWithdrawals = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = statusFilter 
        ? `${API_BASE_URL}/admin/worker/withdrawals?status=${statusFilter}`
        : `${API_BASE_URL}/admin/worker/withdrawals`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      Alert.alert('Error', 'Error al cargar retiros');
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
      case 'COMPLETED': return Colors.light.primary;
      case 'PENDING': return Colors.light.error;
      case 'FAILED': return Colors.light.textSecondary;
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
          <Text style={styles.title}>Retiros</Text>
          <Text style={styles.subtitle}>Consulta de retiros</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Los retiros se procesan automáticamente. Esta pantalla muestra el historial y el estado de cada solicitud.
          </Text>
        </View>

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
              style={[styles.filterButton, statusFilter === 'COMPLETED' && styles.activeFilter]}
              onPress={() => setStatusFilter('COMPLETED')}
            >
              <Text style={styles.filterButtonText}>Completados</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, statusFilter === 'FAILED' && styles.activeFilter]}
              onPress={() => setStatusFilter('FAILED')}
            >
              <Text style={styles.filterButtonText}>Fallidos</Text>
            </Pressable>
          </View>
        </View>

        {withdrawals.map((withdrawal) => (
          <View key={withdrawal.id} style={styles.withdrawalCard}>
            <View style={styles.withdrawalHeader}>
              <Text style={styles.withdrawalAmount}>€{withdrawal.amount}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(withdrawal.status) }]}>
                <Text style={styles.statusText}>{withdrawal.status}</Text>
              </View>
            </View>

            <View style={styles.withdrawalInfo}>
              <Text style={styles.infoLabel}>Usuario:</Text>
              <Text style={styles.infoValue}>{withdrawal.user.username}</Text>
            </View>

            <View style={styles.withdrawalInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{withdrawal.user.email}</Text>
            </View>

            <View style={styles.withdrawalInfo}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formatDate(withdrawal.createdAt)}</Text>
            </View>
          </View>
        ))}

        {withdrawals.length === 0 && (
          <Text style={styles.emptyText}>No hay retiros para mostrar</Text>
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
  infoBox: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
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
  withdrawalCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  withdrawalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  withdrawalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  withdrawalInfo: {
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
