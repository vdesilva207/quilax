import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const SETTINGS_LINKS = [
    { title: t('settings.personalInfo'), href: '/(app)/settings/account' },
    { title: t('settings.bankAccount'), href: '/(app)/settings/bank' },
    {
      title: t('settings.currency'),
      href: '/(app)/settings/currency',
      hint: t('settings.currencyHint'),
    },
    { title: t('settings.privacy'), href: '/(app)/settings/privacy' },
    { title: t('settings.security'), href: '/(app)/settings/security' },
    { title: t('settings.notifications'), href: '/(app)/settings/notifications' },
    { title: t('settings.language'), href: '/(app)/settings/language' },
    { title: t('settings.blockedUsers'), href: '/(app)/settings/blocked' },
    { title: t('settings.helpCenter'), href: '/(app)/settings/help', hint: t('settings.helpHint') },
    { title: t('settings.faq'), href: '/(app)/settings/faq' },
    {
      title: t('settings.support'),
      href: '/(app)/settings/tickets',
      hint: t('settings.supportHint'),
    },
    {
      title: t('settings.terms'),
      href: '/(app)/settings/terms',
      hint: t('settings.termsHint'),
    },
  ];

  return (
    <AppScreen>
      <AppHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <AppSection title={t('settings.options')} accentIndex={0}>
        {SETTINGS_LINKS.map((link) => (
          <Pressable key={link.href} onPress={() => router.push(link.href as any)}>
            <AppCard>
              <Text style={styles.itemTitle}>{link.title}</Text>
              {'hint' in link && link.hint ? (
                <Text style={styles.itemHint}>{link.hint}</Text>
              ) : null}
            </AppCard>
          </Pressable>
        ))}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  itemHint: { marginTop: 4, fontSize: 12, color: Colors.light.textSecondary },
});
