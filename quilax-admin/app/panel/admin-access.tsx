import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import PasswordInput from '@/components/ui/PasswordInput';
import apiClient from '@/lib/api';

export default function AdminAccessScreen() {
  const [currentSecret, setCurrentSecret] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeSecret = async () => {
    if (!currentSecret || !newSecret || !confirmSecret) {
      Alert.alert('Error', 'Todos los campos son requeridos');
      return;
    }

    if (newSecret !== confirmSecret) {
      Alert.alert('Error', 'La nueva contraseña secreta no coincide');
      return;
    }

    if (newSecret.length < 8) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient.post('/admin-auth/change-secret', {
        currentSecret,
        newSecret,
      });

      if (data.success) {
        const scheduled = data.changeScheduledAt
          ? new Date(data.changeScheduledAt).toLocaleString('es-ES')
          : '24 horas';
        Alert.alert(
          'Contraseña programada',
          `${data.message || 'Cambio programado correctamente.'}\n\nEntrará en vigor: ${scheduled}`
        );
        setCurrentSecret('');
        setNewSecret('');
        setConfirmSecret('');
      } else {
        Alert.alert('Error', data.error || 'No se pudo cambiar la contraseña secreta');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al cambiar contraseña secreta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader
        title="Acceso Admin"
        subtitle="Contraseña secreta del panel"
      />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Cambia la contraseña secreta que se solicita en el paso 2 del login admin. El cambio se programa con 24 horas de antelación y se avisa a los admin workers por el inbox interno (sin enviar la contraseña en claro).
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Contraseña secreta actual</Text>
          <PasswordInput
            placeholder="••••••••"
            value={currentSecret}
            onChangeText={setCurrentSecret}
          />

          <Text style={styles.label}>Nueva contraseña secreta</Text>
          <PasswordInput
            placeholder="••••••••"
            value={newSecret}
            onChangeText={setNewSecret}
          />

          <Text style={styles.label}>Confirmar nueva contraseña</Text>
          <PasswordInput
            placeholder="••••••••"
            value={confirmSecret}
            onChangeText={setConfirmSecret}
          />

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Solo el admin principal puede realizar este cambio. Requiere sesión autenticada.
            </Text>
          </View>

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangeSecret}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Programar cambio de secreto</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.four },
  description: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.four,
  },
  form: { gap: Spacing.two },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: Spacing.two,
  },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    padding: Spacing.three,
    fontSize: 16,
  },
  note: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 12,
    marginTop: Spacing.two,
  },
  noteText: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20 },
  button: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
