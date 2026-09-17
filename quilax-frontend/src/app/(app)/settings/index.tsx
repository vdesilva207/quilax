import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, sora } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const SETTINGS_LINKS = [
    { title: t('settings.personalInfo'), href: '/settings/account' },
    {
      title: t('settings.currency'),
      href: '/settings/currency',
      hint: t('settings.currencyHint'),
    },
    { title: t('settings.privacy'), href: '/settings/privacy' },
    { title: t('settings.security'), href: '/settings/security' },
    { title: t('settings.notifications'), href: '/settings/notifications' },
    { title: t('settings.language'), href: '/settings/language' },
    { title: t('settings.blockedUsers'), href: '/settings/blocked' },
    { title: t('settings.helpCenter'), href: '/settings/help', hint: t('settings.helpHint') },
    { title: t('settings.faq'), href: '/settings/faq' },
    {
      title: t('settings.support'),
      href: '/settings/tickets',
      hint: t('settings.supportHint'),
    },
    {
      title: t('settings.terms'),
      href: '/settings/terms',
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
  itemTitle: {
    ...sora(600),
    fontSize: 16,
    color: Colors.light.text,
  },
  itemHint: {
    ...sora(500),
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textSecondary,
  },
});