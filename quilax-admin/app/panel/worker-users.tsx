import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';

interface User {
  id: number;
  email: string;
  username: string;
  balance: number;
  points: number;
  createdAt: string;
}

export default function WorkerUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const url = search 
        ? `${API_BASE_URL}/admin/worker/users?search=${search}`
        : `${API_BASE_URL}/admin/worker/users`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Error al cargar usuarios');
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
          <Text style={styles.title}>Usuarios</Text>
          <Text style={styles.subtitle}>Gestión limitada</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por email o username..."
          value={search}
          onChangeText={setSearch}
        />

        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <Text style={styles.username}>{user.username}</Text>
              <Text style={styles.userId}>#{user.id}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.infoLabel}>Balance:</Text>
              <Text style={styles.infoValue}>{user.balance} créditos</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.infoLabel}>Puntos:</Text>
              <Text style={styles.infoValue}>{user.points}</Text>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.infoLabel}>Registrado:</Text>
              <Text style={styles.infoValue}>{formatDate(user.createdAt)}</Text>
            </View>
          </View>
        ))}

        {users.length === 0 && (
          <Text style={styles.emptyText}>No hay usuarios para mostrar</Text>
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
  searchInput: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  userCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  userId: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  userInfo: {
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
