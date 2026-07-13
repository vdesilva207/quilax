import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';
import CustomIcon from '@/components/CustomIcon';

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

interface FinancialStats {
  totalCredits: number;
  totalRevenue: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  completedPayments: number;
  pendingPayments: number;
}

export default function AdminFinancialScreen() {
  const router = useRouter();
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'withdrawals'>('overview');

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      // Cargar estadísticas financieras
      const statsResponse = await fetch(`${API_BASE_URL}/admin/financial/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const statsData = await statsResponse.json();
      if (statsData.success) {
        setFinancialStats(statsData.stats);
      }

      // Cargar pagos
      const paymentsResponse = await fetch(`${API_BASE_URL}/admin/payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const paymentsData = await paymentsResponse.json();
      if (paymentsData.success) {
        setPayments(paymentsData.payments);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
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
          <Text style={styles.title}>Finanzas</Text>
          <Text style={styles.subtitle}>Gestión financiera</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Resumen</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
            onPress={() => setActiveTab('payments')}
          >
            <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Pagos</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'withdrawals' && styles.activeTab]}
            onPress={() => setActiveTab('withdrawals')}
          >
            <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.activeTabText]}>Retiros</Text>
          </Pressable>
        </View>

        {activeTab === 'overview' && (
          <>
            {/* Balance Principal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Balance Principal</Text>
              <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Créditos Totales</Text>
                <Text style={styles.balanceValue}>{financialStats?.totalCredits || 0} créditos</Text>
                <Text style={styles.balanceEquivalent}>≈ €{(financialStats?.totalCredits || 0).toFixed(2)}</Text>
              </View>
            </View>

            {/* Métricas Financieras */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Métricas Financieras</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Ingresos Totales</Text>
                  <Text style={styles.metricValue}>€{(financialStats?.totalRevenue || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Retiros Totales</Text>
                  <Text style={styles.metricValue}>€{(financialStats?.totalWithdrawals || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Pagos Completados</Text>
                  <Text style={styles.metricValue}>{financialStats?.completedPayments || 0}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Retiros Pendientes</Text>
                  <Text style={[styles.metricValue, styles.warningValue]}>{financialStats?.pendingWithdrawals || 0}</Text>
                </View>
              </View>
            </View>

            {/* Ingresos por Tipo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingresos por Tipo</Text>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>BANK_TO_CREDITS</Text>
                <Text style={styles.metricValue}>€35,000</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>QUIZ_ENTRY</Text>
                <Text style={styles.metricValue}>€8,500</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>PLATFORM_FEE</Text>
                <Text style={styles.metricValue}>€1,730</Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'payments' && (
          <>
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
              </View>
            ))}

            {payments.length === 0 && (
              <Text style={styles.emptyText}>No hay pagos para mostrar</Text>
            )}
          </>
        )}

        {activeTab === 'withdrawals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gestión de Retiros</Text>
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Funcionalidad de retiros próximamente</Text>
            </View>
          </View>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    padding: Spacing.one,
  },
  tab: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  balanceCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.six,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  balanceEquivalent: {
    fontSize: 18,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metricCard: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    minWidth: '45%',
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  warningValue: {
    color: Colors.light.error,
  },
  paymentCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.three,
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
  emptyText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
