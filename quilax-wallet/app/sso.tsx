import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, StyleSheet, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { saveToken } from '../src/lib/secureStorage';
import { stripTokenFromUrl, captureTokenFromLocation } from '../src/lib/authTokenFromUrl';
import { Colors, Spacing } from '../src/constants/theme';

/**
 * Landing SSO: /sso?token=... — guarda el JWT y recarga el inicio.
 * Evita que Expo Router pierda el query string y que el AuthProvider no se reinicie.
 */
export default function SsoScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = params.token;
        const fromParams = Array.isArray(raw) ? raw[0] : raw;
        const token = (fromParams && String(fromParams).trim()) || captureTokenFromLocation();
        if (!token) {
          if (!cancelled) setError('Falta el token de acceso. Abre Gestión desde la app Quilax.');
          return;
        }
        await saveToken(token);
        stripTokenFromUrl();
        if (cancelled) return;
        // Hard reload para que WalletAuthProvider lea el token guardado
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.replace('/');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'No se pudo guardar la sesión');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  return (
    <View style={styles.box}>
      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.text}>Entrando en Gestión…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.background,
    padding: Spacing.four,
  },
  text: { color: Colors.textSecondary },
  err: { color: Colors.error, textAlign: 'center' },
});
