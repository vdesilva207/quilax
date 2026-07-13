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

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace('/(app)');
    } else {
      Alert.alert('Error', result.error || 'Credenciales inválidas');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.light.gradientStart, Colors.light.gradientEnd, Colors.light.error]}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text style={styles.title}>QUILAX</Text>
        <Text style={styles.subtitle}>{t('auth.login')}</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          testID="email-input"
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={Colors.light.textSecondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          testID="password-input"
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable testID="forgot-password-button" onPress={() => router.push('/(auth)/forgot-password')}>
          <Text style={styles.forgotPassword}>{t('auth.forgotPassword')}</Text>
        </Pressable>

        <Pressable
          testID="login-submit-button"
          style={[styles.button, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('auth.login')}</Text>
          )}
        </Pressable>

        <Pressable testID="register-button" style={styles.registerButton} onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
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
  label: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
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
  registerButton: { padding: Spacing.four, alignItems: 'center' },
  registerButtonText: { color: Colors.light.primary, fontSize: 16, fontWeight: '600' },
});
