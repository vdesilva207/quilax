import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';
import CustomIcon from '@/components/CustomIcon';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son requeridos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }

    // Validar nueva contraseña: al menos 8 caracteres y 1 mayúscula
    if (newPassword.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      Alert.alert('Error', 'La contraseña debe tener al menos 1 mayúscula');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/admin-auth/change-personal-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Éxito', 'Contraseña personal cambiada exitosamente');
        router.back();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Error al cambiar contraseña personal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
          <Text style={styles.title}>Cambiar Contraseña</Text>
          <Text style={styles.subtitle}>Contraseña Personal</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <Text style={styles.label}>Contraseña Actual</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Pressable style={styles.showPasswordButton} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
              <CustomIcon name={showCurrentPassword ? 'eye-off' : 'eye'} size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.label}>Nueva Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Pressable style={styles.showPasswordButton} onPress={() => setShowNewPassword(!showNewPassword)}>
              <CustomIcon name={showNewPassword ? 'eye-off' : 'eye'} size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <Pressable style={styles.showPasswordButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <CustomIcon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Requisitos:</Text>
            <Text style={styles.requirementText}>• Mínimo 8 caracteres</Text>
            <Text style={styles.requirementText}>• Al menos 1 mayúscula</Text>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Cambiar Contraseña</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
  },
  form: {
    gap: Spacing.four,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.four,
    fontSize: 16,
  },
  showPasswordButton: {
    padding: Spacing.four,
    paddingRight: Spacing.three,
  },
  requirements: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  requirementText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.one,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
