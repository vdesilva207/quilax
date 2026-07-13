import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    const result = await register(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace('/(auth)/verify-email');
    } else {
      Alert.alert('Error', result.error || 'Error al registrarse');
    }
  };

  return (
    <View style={styles.container} testID="register-screen">
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={styles.title}>QUILAX</Text>
        <Text style={styles.subtitle}>{t('auth.register')}</Text>
      </LinearGradient>

      <View style={styles.form}>
        <TextInput
          testID="email-input"
          style={styles.input}
          placeholder={t('auth.email')}
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          testID="password-input"
          style={styles.input}
          placeholder={t('auth.password')}
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          testID="confirm-password-input"
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable
          testID="submit-register-button"
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.register')}</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLink}>{t('auth.login')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  gradientHeader: {
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  title: { fontSize: 56, fontWeight: 'bold', color: '#FFFFFF', marginBottom: Spacing.two },
  subtitle: { fontSize: 24, fontWeight: '600', color: '#FFFFFF' },
  form: { padding: Spacing.six, gap: Spacing.three },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loginLink: {
    textAlign: 'center',
    color: Colors.light.primary,
    fontSize: 16,
    fontWeight: '600',
    padding: Spacing.four,
  },
});
