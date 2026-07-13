import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface Payment {
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

export default function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const fetchPayments = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = statusFilter 
        ? `${API_BASE_URL}/admin/payments?status=${statusFilter}`
        : `${API_BASE_URL}/admin/payments`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setPayments(data.payments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert('Error', 'Error al cargar pagos');
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
      case 'FAILED': return Colors.light.error;
      case 'PENDING': return Colors.light.backgroundSelected;
      case 'REFUNDED': return Colors.light.textSecondary;
      default: return Colors.light.backgroundSelected;
    }
  };

  const handleRefund = async (paymentId: number) => {
    Alert.alert(
      'Procesar Refund',
      '¿Estás seguro de que quieres procesar un refund para este pago?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await fetch(`${API_BASE_URL}/admin/payments/${paymentId}/refund`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: 'Refund solicitado por admin' }),
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Éxito', 'Refund procesado correctamente');
                fetchPayments();
              } else {
                Alert.alert('Error', data.error);
              }
            } catch (error) {
              Alert.alert('Error', 'Error al procesar refund');
            }
          }
        }
      ]
    );
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
          <Text style={styles.title}>Pagos</Text>
          <Text style={styles.subtitle}>Gestión de pagos</Text>
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
            <Pressable
              style={[styles.filterButton, statusFilter === 'PENDING' && styles.activeFilter]}
              onPress={() => setStatusFilter('PENDING')}
            >
              <Text style={styles.filterButtonText}>Pendientes</Text>
            </Pressable>
          </View>
        </View>

        {payments.map((payment) => (
          <View key={payment.id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentAmount}>€{payment.amount}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) }]}>
                <Text style={styles.statusText}>{payment.status}</Text>
              </View>
            </View>

            <View style={styles.paymentInfo}>
              <Text style={styles.infoLabel}>Usuario:</Text>
              <Text style={styles.infoValue}>{payment.user.username}</Text>
            </View>

            <View style={styles.paymentInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{payment.user.email}</Text>
            </View>

            <View style={styles.paymentInfo}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formatDate(payment.createdAt)}</Text>
            </View>

            {payment.status === 'COMPLETED' && (
              <Pressable
                style={styles.refundButton}
                onPress={() => handleRefund(payment.id)}
              >
                <Text style={styles.refundButtonText}>Procesar Refund</Text>
              </Pressable>
            )}
          </View>
        ))}

        {payments.length === 0 && (
          <Text style={styles.emptyText}>No hay pagos para mostrar</Text>
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
  paymentCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  paymentAmount: {
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
  paymentInfo: {
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
  refundButton: {
    backgroundColor: Colors.light.error,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  refundButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
