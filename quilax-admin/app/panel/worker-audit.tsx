import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface AuditLog {
  id: number;
  action: string;
  adminId: number;
  createdAt: string;
  result: string;
}

export default function WorkerAuditScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const fetchLogs = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = actionFilter 
        ? `${API_BASE_URL}/admin/worker-audit?action=${actionFilter}`
        : `${API_BASE_URL}/admin/worker-audit`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      Alert.alert('Error', 'Error al cargar logs de auditoría');
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

  const getResultColor = (result: string) => {
    return result === 'SUCCESS' ? Colors.light.primary : Colors.light.error;
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
          <Text style={styles.title}>Auditoría</Text>
          <Text style={styles.subtitle}>Registro de actividad</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Filtrar por acción:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              <Pressable
                style={[styles.filterButton, !actionFilter && styles.activeFilter]}
                onPress={() => setActionFilter('')}
              >
                <Text style={styles.filterButtonText}>Todas</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, actionFilter === 'APPROVE_QUIZ' && styles.activeFilter]}
                onPress={() => setActionFilter('APPROVE_QUIZ')}
              >
                <Text style={styles.filterButtonText}>Aprobar Quiz</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, actionFilter === 'REJECT_QUIZ' && styles.activeFilter]}
                onPress={() => setActionFilter('REJECT_QUIZ')}
              >
                <Text style={styles.filterButtonText}>Rechazar Quiz</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, actionFilter === 'RESPOND_TICKET' && styles.activeFilter]}
                onPress={() => setActionFilter('RESPOND_TICKET')}
              >
                <Text style={styles.filterButtonText}>Responder Ticket</Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, actionFilter === 'BLOCK_USER' && styles.activeFilter]}
                onPress={() => setActionFilter('BLOCK_USER')}
              >
                <Text style={styles.filterButtonText}>Bloquear User</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {logs.map((log) => (
          <View key={log.id} style={styles.logCard}>
            <View style={styles.logHeader}>
              <Text style={styles.logAction}>{log.action}</Text>
              <View style={[styles.resultBadge, { backgroundColor: getResultColor(log.result) }]}>
                <Text style={styles.resultText}>{log.result}</Text>
              </View>
            </View>

            <View style={styles.logInfo}>
              <Text style={styles.infoLabel}>Admin ID:</Text>
              <Text style={styles.infoValue}>#{log.adminId}</Text>
            </View>

            <View style={styles.logInfo}>
              <Text style={styles.infoLabel}>Fecha:</Text>
              <Text style={styles.infoValue}>{formatDate(log.createdAt)}</Text>
            </View>
          </View>
        ))}

        {logs.length === 0 && (
          <Text style={styles.emptyText}>No hay logs para mostrar</Text>
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
  logCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  logAction: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  resultBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  resultText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logInfo: {
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
