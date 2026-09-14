import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WalletShell } from '@/components/WalletShell';
import { Colors, Spacing } from '@/constants/theme';

const SECTION_KEYS = ['moneyHere', 'credits', 'withdraw', 'privacy'] as const;

export default function LegalScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <WalletShell
      title={t('legal.title')}
      subtitle={t('legal.subtitle')}
      footer={
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>{t('common.goBack')}</Text>
        </Pressable>
      }
    >
      <ScrollView style={{ maxHeight: 420 }}>
        <Text style={styles.intro}>{t('legal.intro')}</Text>
        {SECTION_KEYS.map((key) => (
          <View key={key} style={styles.card}>
            <Text style={styles.title}>{t(`legal.${key}Title`)}</Text>
            <Text style={styles.body}>{t(`legal.${key}Body`)}</Text>
          </View>
        ))}
      </ScrollView>
    </WalletShell>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.text,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backText: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
