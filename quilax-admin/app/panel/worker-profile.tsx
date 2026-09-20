import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { API_BASE_URL } from '@/lib/api';
import { clearAuthSession } from '@/lib/secureStorage';

interface Admin {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function WorkerProfileScreen() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin/worker/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAdmin(data.admin);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Gestión de cuenta</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {admin?.username?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{admin?.username}</Text>
              <Text style={styles.email}>{admin?.email}</Text>
            </View>
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Admin worker</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información de la cuenta</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValue}>#{admin?.id}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{admin?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Miembro desde:</Text>
            <Text style={styles.infoValue}>{formatDate(admin?.createdAt || '')}</Text>
          </View>
        </View>

        <Text style={styles.hint}>
          Para cambiar la contraseña, contacta al admin principal.
        </Text>

        <Pressable
          style={[styles.actionButton, styles.logoutButton]}
          onPress={async () => {
            await clearAuthSession();
            apiClient.clearToken();
            router.replace('/auth/login');
          }}
        >
          <Text style={styles.actionButtonText}>Cerrar Sesión</Text>
        </Pressable>
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
    gap: Spacing.six,
  },
  profileCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.four,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  email: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.backgroundSelected,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  infoSection: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
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
  hint: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: Colors.light.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
