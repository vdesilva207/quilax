import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';
import { APP_GRADIENT, GRADIENT_HORIZONTAL } from '@/constants/gradients';
import adminService from '@/services/adminService';
import apiClient from '@/lib/api';
import { saveAuthSession } from '@/lib/secureStorage';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Introduce email y contraseña');
      return;
    }

    setLoading(true);
    const result = await adminService.login(email, password, twoFactorCode || undefined);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error || 'No se pudo iniciar sesión');
      return;
    }

    const { token, refreshToken, user } = result.data;
    if (!user || !['ADMIN', 'ADMIN_WORKER'].includes(user.role)) {
      Alert.alert('Acceso denegado', 'Esta cuenta no tiene permisos de administración');
      return;
    }

    apiClient.setToken(token);
    await saveAuthSession({ accessToken: token, refreshToken, user });

    if (user.role === 'ADMIN_WORKER') {
      router.replace('/panel/worker-dashboard');
    } else {
      router.replace('/panel/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[...APP_GRADIENT]} style={styles.header} {...GRADIENT_HORIZONTAL}>
        <Text style={styles.title}>Quilax Admin</Text>
        <Text style={styles.subtitle}>Panel de administración</Text>
      </LinearGradient>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Código 2FA (si aplica)"
          value={twoFactorCode}
          onChangeText={setTwoFactorCode}
        />

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar sesión</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { padding: Spacing.six, paddingTop: 80 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.one },
  form: { padding: Spacing.four, gap: Spacing.three },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 16,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.three,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
