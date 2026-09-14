import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Stripe Identity return_url landing.
 * The mobile app polls /profile/identity/status; this page is a friendly close tab.
 */
export default function IdentityReturnScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        router.replace('/');
      } catch {
        /* ignore */
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.box}>
      <Text style={styles.title}>{t('identity.title')}</Text>
      <Text style={styles.body}>{t('identity.body')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0B1220',
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  body: { color: '#C9D1D9', fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
