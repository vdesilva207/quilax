import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter } from 'expo-router';
import apiClient from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Introduce tu email');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email: email.trim() });
      Alert.alert('Email enviado', 'Revisa tu bandeja de entrada');
      router.push('/(auth)/reset-password');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar el email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} testID="forgot-password-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{t('common.appName')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgotPassword')}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.description}>
          Introduce tu email para recibir instrucciones para restablecer tu contraseña
        </Text>
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
        <Pressable testID="submit-forgot-password-button" style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Enviando...' : t('auth.resetPassword')}</Text>
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
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.light.gradientStart,
    marginBottom: Spacing.two,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  input: {
    backgroundColor: Colors.light.background,
    padding: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
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
    fontWeight: '600',
  },
});
