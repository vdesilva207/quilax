import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import CustomIcon from '@/components/CustomIcon';
import apiClient from '@/lib/api';

import apiClient from '@/lib/api';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!token || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, password: newPassword });
      Alert.alert('Éxito', 'Contraseña actualizada');
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.resetPassword')}</Text>
        <Text style={styles.subtitle}>Introduce tu nueva contraseña</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Token de recuperación"
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Nueva contraseña"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry={!showNewPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <Pressable style={styles.showPasswordButton} onPress={() => setShowNewPassword(!showNewPassword)}>
            <CustomIcon name={showNewPassword ? 'eye-off' : 'eye'} size={20} color={Colors.light.textSecondary} />
          </Pressable>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirmar nueva contraseña"
            placeholderTextColor={Colors.light.textSecondary}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable style={styles.showPasswordButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <CustomIcon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={Colors.light.textSecondary} />
          </Pressable>
        </View>

        <Pressable style={styles.button} onPress={handleResetPassword}>
          <Text style={styles.buttonText}>Restablecer</Text>
        </Pressable>
        
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{t('common.back')}</Text>
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
  header: {
    padding: Spacing.six,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
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
  button: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: Spacing.four,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.light.primary,
    fontSize: 16,
  },
});
