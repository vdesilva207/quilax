import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleVerify = async () => {
    try {
      await apiClient.post('/auth/verify-email');
      router.replace('/(auth)/currency-selection');
    } catch (error) {
      console.error(error);
      router.replace('/(app)');
    }
  };

  return (
    <View style={styles.container} testID="email-verification-screen">
      <Text style={styles.title}>Verifica tu email</Text>
      <Text style={styles.subtitle}>Hemos enviado un enlace a {user?.email}</Text>
      <Pressable style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Continuar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.six, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: Spacing.two },
  subtitle: { color: Colors.light.textSecondary, marginBottom: Spacing.four },
  button: { backgroundColor: Colors.light.primary, padding: Spacing.four, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
