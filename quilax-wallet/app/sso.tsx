/**
 * Entrada SSO desde la app: /sso?token=…
 * Guarda sesión y entra a Gestión (no es la pantalla “entra por la app”).
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Fonts } from '@/constants/theme';
import { saveToken } from '@/lib/api';
import { setAppLanguage } from '@/i18n';
import { APP_SESSION_KEY, RECOVERY_SESSION_KEY } from '@/components/SessionBootstrap';

function readTokenFromHash(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const raw = window.location.hash.replace(/^#/, '');
    if (!raw) return null;
    if (raw.startsWith('token=')) {
      const value = raw.slice('token='.length).split(/[?&]/)[0];
      return decodeURIComponent(value.trim()) || null;
    }
    const hp = new URLSearchParams(raw.replace(/^\?/, ''));
    return hp.get('token')?.trim() || null;
  } catch {
    return null;
  }
}

export default function SsoRedirect() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string | string[]; lang?: string | string[] }>();
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const raw = params.token;
      const fromParams = Array.isArray(raw) ? raw[0] : raw;
      const token =
        (fromParams && String(fromParams).trim()) ||
        readTokenFromHash() ||
        (Platform.OS === 'web' && typeof localStorage !== 'undefined'
          ? localStorage.getItem('quilax_session_token')
          : null);

      const langRaw = params.lang;
      const langParam = Array.isArray(langRaw) ? langRaw[0] : langRaw;
      if (langParam) {
        try {
          await setAppLanguage(String(langParam));
        } catch {
          /* keep current */
        }
      }

      if (!token) {
        if (!cancelled) router.replace('/login');
        return;
      }

      try {
        await saveToken(token);
        if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(APP_SESSION_KEY, '1');
          sessionStorage.removeItem(RECOVERY_SESSION_KEY);
        }
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/');
        }
        if (!cancelled) router.replace('/');
      } catch {
        if (!cancelled) {
          setErr(t('errors.sessionNotReceived', { defaultValue: 'No se pudo abrir la sesión' }));
          router.replace('/login');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token, params.lang, router, t]);

  return (
    <View style={styles.box}>
      <ActivityIndicator color={Colors.primary} />
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: 12,
  },
  err: {
    fontFamily: Fonts.body,
    color: Colors.error,
    fontSize: 14,
  },
});
