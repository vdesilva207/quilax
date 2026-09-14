import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import apiClient from '@/lib/api';

interface KYCDocument {
  id: number;
  documentType: string;
  documentUrl: string;
  status: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function KYCScreen() {
  const router = useRouter();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const data = await apiClient.get(`/admin/kyc${query}`);

      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching KYC documents:', error);
      Alert.alert('Error', 'Error al cargar documentos KYC');
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
      case 'PENDING': return Colors.light.error;
      case 'APPROVED': return Colors.light.primary;
      case 'REJECTED': return Colors.light.textSecondary;
      default: return Colors.light.backgroundSelected;
    }
  };

  const handleApprove = async (kycId: number) => {
    try {
      const data = await apiClient.post(`/admin/kyc/${kycId}/approve`);

      if (data.success) {
        Alert.alert('Éxito', 'Documento aprobado');
        fetchDocuments();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Error al aprobar documento');
    }
  };

  const handleReject = async (kycId: number) => {
    Alert.prompt(
      'Rechazar documento',
      'Motivo del rechazo:',
      async (reason) => {
        if (!reason) return;

        try {
          const data = await apiClient.post(`/admin/kyc/${kycId}/reject`, { reason });

          if (data.success) {
            Alert.alert('Éxito', 'Documento rechazado');
            fetchDocuments();
          } else {
            Alert.alert('Error', data.error);
          }
        } catch (error) {
          Alert.alert('Error', error instanceof Error ? error.message : 'Error al rechazar documento');
        }
      }
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
          <Text style={styles.title}>KYC Enhanced</Text>
          <Text style={styles.subtitle}>Verificación de identidad</Text>
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
              style={[styles.filterButton, statusFilter === 'APPROVED' && styles.activeFilter]}
              onPress={() => setStatusFilter('APPROVED')}
            >
              <Text style={styles.filterButtonText}>Aprobados</Text>
            </Pressable>
            <Pressable
              style={[styles.filterButton, statusFilter === 'REJECTED' && styles.activeFilter]}
              onPress={() => setStatusFilter('REJECTED')}
            >
              <Text style={styles.filterButtonText}>Rechazados</Text>
            </Pressable>
          </View>
        </View>

        {documents.map((doc) => (
          <View key={doc.id} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentType}>{doc.documentType}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(doc.status) }]}>
                <Text style={styles.statusText}>{doc.status}</Text>
              </View>
            </View>

            <View style={styles.documentInfo}>
              <Text style={styles.infoLabel}>Usuario:</Text>
              <Text style={styles.infoValue}>{doc.user.username}</Text>
            </View>

            <View style={styles.documentInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{doc.user.email}</Text>
            </View>

            <View style={styles.documentInfo}>
              <Text style={styles.infoLabel}>Enviado:</Text>
              <Text style={styles.infoValue}>{formatDate(doc.createdAt)}</Text>
            </View>

            {doc.status === 'PENDING' && (
              <View style={styles.actionButtons}>
                <Pressable
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(doc.id)}
                >
                  <Text style={styles.actionButtonText}>Aprobar</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(doc.id)}
                >
                  <Text style={styles.actionButtonText}>Rechazar</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        {documents.length === 0 && (
          <Text style={styles.emptyText}>No hay documentos para mostrar</Text>
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
  documentCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  documentType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
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
  documentInfo: {
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
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.light.primary,
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
  },
  actionButtonText: {
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
