import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import { SCREEN_BACKGROUND } from '@/constants/gradients';

/** Web: IAP not available — point users to Gestión (manual IBAN). */
export default function BuyCreditsWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <AppScreen>
      <AppHeader title={t('buyCredits.title')} showBack />
      <View style={styles.body}>
        <Text style={styles.copy}>{t('buyCredits.webBlocked')}</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/(app)/wallet')}>
          <Text style={styles.ctaText}>{t('buyCredits.openWallet')}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    backgroundColor: SCREEN_BACKGROUND,
  },
  copy: {
    ...bodyTypeface,
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  cta: {
    marginTop: Spacing.three,
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800' },
});
