import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/lib/api';
import { getStoredAuthToken, getStoredAuthUser } from '@/lib/secureStorage';
import PasswordInput from '@/components/ui/PasswordInput';
import CustomIcon from '@/components/CustomIcon';

function notify(title: string, message?: string) {
  const text = message ? `${title}\n${message}` : title;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(text);
    return;
  }
  Alert.alert(title, message);
}

/** Solo admin principal (rol ADMIN). No workers. */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    getStoredAuthUser().then((user) => {
      setAllowed(user?.role === 'ADMIN');
    });
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFormError('Todos los campos son requeridos');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setFormError('La contraseña debe tener al menos 1 mayúscula');
      return;
    }

    setFormError('');
    setLoading(true);

    try {
      const token = await getStoredAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin-auth/change-personal-password`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        notify('Éxito', 'Contraseña personal cambiada');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        router.back();
      } else {
        const msg = data.error || `No se pudo cambiar (${response.status})`;
        setFormError(msg);
        notify('Error', msg);
      }
    } catch {
      const msg = 'Error de red al cambiar contraseña';
      setFormError(msg);
      notify('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (allowed === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.denied}>Solo el admin principal puede cambiar su contraseña aquí.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Volver</Text>
        </Pressable>
      </View>
    );
  }

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
          <Text style={styles.title}>Mi contraseña</Text>
          <Text style={styles.subtitle}>Admin principal · personal</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Text style={styles.label}>Contraseña actual</Text>
          <PasswordInput
            placeholder="••••••••"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />

          <Text style={styles.label}>Nueva contraseña</Text>
          <PasswordInput
            placeholder="Mín. 8 caracteres, 1 mayúscula"
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={styles.label}>Confirmar nueva</Text>
          <PasswordInput
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <Pressable
            style={[styles.submit, loading && styles.submitDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Guardar contraseña</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.six,
    backgroundColor: Colors.light.background,
  },
  denied: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  backLink: { color: Colors.light.primary, fontWeight: '700', fontSize: 16 },
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  backButton: { position: 'absolute', left: Spacing.four, top: Spacing.six, zIndex: 1 },
  headerContent: { alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: Spacing.one },
  subtitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  content: { flex: 1 },
  form: { padding: Spacing.six, gap: Spacing.two },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.two,
    marginBottom: Spacing.one,
  },
  formError: { color: Colors.light.error, fontWeight: '600', marginTop: Spacing.two },
  submit: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
