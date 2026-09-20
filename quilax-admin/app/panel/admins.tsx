import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Modal, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { API_BASE_URL } from '@/lib/api';
import { getStoredAuthToken } from '@/lib/secureStorage';
import PasswordInput from '@/components/ui/PasswordInput';

interface Admin {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

function notify(title: string, message?: string) {
  const text = message ? `${title}\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

export default function AdminsScreen() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ADMIN_WORKER');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const token = await getStoredAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAdmins(data.admins);
      } else {
        notify('Error', data.error || 'No se pudieron cargar los admins');
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      notify('Error', 'Error al cargar admins');
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

  const handleCreateAdmin = async () => {
    if (!email || !username || !password || !role) {
      setFormError('Todos los campos son requeridos');
      return;
    }

    setFormError('');
    setCreating(true);

    try {
      const token = await getStoredAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/admins`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim(),
          password,
          role,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        notify('Éxito', data.promoted ? 'Usuario existente promocionado a admin' : 'Admin creado correctamente');
        setShowCreateModal(false);
        setEmail('');
        setUsername('');
        setPassword('');
        setRole('ADMIN_WORKER');
        setFormError('');
        fetchAdmins();
      } else {
        const msg = data.error || `Error al crear admin (${response.status})`;
        setFormError(msg);
        notify('Error', msg);
      }
    } catch (error) {
      const msg = 'Error de red al crear admin';
      setFormError(msg);
      notify('Error', msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    const confirmed =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.confirm('¿Eliminar este admin?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Eliminar Admin',
              '¿Estás seguro de que quieres eliminar este admin?',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Eliminar', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmed) return;

    try {
      const token = await getStoredAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        notify('Éxito', 'Admin eliminado');
        fetchAdmins();
      } else {
        notify('Error', data.error || 'No se pudo eliminar');
      }
    } catch (error) {
      notify('Error', 'Error al eliminar admin');
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
          <Text style={styles.title}>Admins</Text>
          <Text style={styles.subtitle}>Gestión de administradores</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Pressable
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Crear Admin</Text>
        </Pressable>

        {admins.map((admin) => (
          <View key={admin.id} style={styles.adminCard}>
            <View style={styles.adminHeader}>
              <Text style={styles.adminUsername}>{admin.username}</Text>
              <View style={[styles.roleBadge, { backgroundColor: admin.role === 'ADMIN' ? Colors.light.primary : Colors.light.backgroundSelected }]}>
                <Text style={styles.roleBadgeText}>{admin.role}</Text>
              </View>
            </View>

            <View style={styles.adminInfo}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{admin.email}</Text>
            </View>

            <View style={styles.adminInfo}>
              <Text style={styles.infoLabel}>Creado:</Text>
              <Text style={styles.infoValue}>{formatDate(admin.createdAt)}</Text>
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteAdmin(admin.id)}
            >
              <Text style={styles.deleteButtonText}>Eliminar</Text>
            </Pressable>
          </View>
        ))}

        {admins.length === 0 && (
          <Text style={styles.emptyText}>No hay admins para mostrar</Text>
        )}
      </View>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Nuevo Admin</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <PasswordInput
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              containerStyle={styles.passwordInModal}
            />
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.roleSelector}>
              <Text style={styles.roleLabel}>Rol:</Text>
              <View style={styles.roleButtons}>
                <Pressable
                  style={[styles.roleButton, role === 'ADMIN' && styles.selectedRole]}
                  onPress={() => setRole('ADMIN')}
                >
                  <Text style={styles.roleButtonText}>ADMIN</Text>
                </Pressable>
                <Pressable
                  style={[styles.roleButton, role === 'ADMIN_WORKER' && styles.selectedRole]}
                  onPress={() => setRole('ADMIN_WORKER')}
                >
                  <Text style={styles.roleButtonText}>WORKER</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleCreateAdmin}
                disabled={creating}
              >
                <Text style={styles.modalButtonText}>{creating ? 'Creando...' : 'Crear'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  createButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  adminCard: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  adminUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  roleBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  adminInfo: {
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
  deleteButton: {
    backgroundColor: Colors.light.error,
    padding: Spacing.three,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  deleteButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    padding: Spacing.six,
    borderRadius: 12,
    width: '90%',
    gap: Spacing.four,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.backgroundSelected,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  passwordInModal: {
    marginBottom: 0,
  },
  formError: {
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
  },
  roleSelector: {
    gap: Spacing.two,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleButton: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSelected,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    alignItems: 'center',
  },
  selectedRole: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  roleButtonText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.light.backgroundSelected,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
  },
  modalButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
