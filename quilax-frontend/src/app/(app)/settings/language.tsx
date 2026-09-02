import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import CustomIcon from '@/components/CustomIcon';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { InfoBar } from '@/components/ui/ScreenChrome';
import { APP_LANGUAGES, AppLanguage, normalizeAppLanguage, setAppLanguage } from '@/i18n';
import apiClient from '@/lib/api';
import { AppLanguageFlags } from '@/components/FlagIcons';

const LANGUAGES: {
  code: AppLanguage;
  name: string;
  nativeName: string;
}[] = [
  { code: 'es', name: 'Español', nativeName: 'Español' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'Français', nativeName: 'Français' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Português', nativeName: 'Português' },
  { code: 'nl', name: 'Nederlands', nativeName: 'Nederlands' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano' },
];

export default function LanguageSettingsScreen() {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(
    normalizeAppLanguage(i18n.language)
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setSelectedLanguage(normalizeAppLanguage(i18n.language));
  }, [i18n.language]);

  const handleLanguageChange = async (languageCode: string) => {
    const next = normalizeAppLanguage(languageCode);
    if (next === selectedLanguage || saving) return;

    setSaving(true);
    setFeedback('');
    try {
      // En web Alert.alert no confirma bien; aplicamos el cambio al tocar.
      const lng = await setAppLanguage(next, {
        syncProfile: async (code) => {
          try {
            await apiClient.put('/profile/language', { language: code });
          } catch {
            /* sin token / offline: UI igual cambia */
          }
        },
      });
      setSelectedLanguage(lng);
      setFeedback(t('settings.updated'));
    } catch (err: any) {
      setFeedback(err?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const current = LANGUAGES.find((lang) => lang.code === selectedLanguage);

  return (
    <AppScreen>
      <AppHeader title={t('settings.languageTitle')} showBack backHref="/(app)/settings" />
      <AppSection title={t('settings.currentLanguage')} accentIndex={0}>
        <AppCard>
          <View style={styles.currentRow}>
            {current ? (
              <AppLanguageFlags code={current.code} width={22} height={14} />
            ) : null}
            <Text style={styles.currentName}>{current?.nativeName}</Text>
          </View>
          <Text style={styles.currentCode}>{current?.code.toUpperCase()}</Text>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
        </AppCard>
      </AppSection>
      <AppSection title={t('settings.available')} accentIndex={1}>
        {LANGUAGES.filter((l) => (APP_LANGUAGES as readonly string[]).includes(l.code)).map(
          (language) => {
            const active = selectedLanguage === language.code;
            return (
              <Pressable
                key={language.code}
                disabled={saving}
                onPress={() => handleLanguageChange(language.code)}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: saving }}
                style={({ pressed }) => [
                  pressed && !active ? styles.pressed : null,
                  saving ? styles.disabled : null,
                ]}
              >
                <AppCard style={active ? styles.selectedCard : undefined}>
                  <View style={styles.row}>
                    <View style={styles.langInfo}>
                      <View style={styles.langNameRow}>
                        <AppLanguageFlags code={language.code} width={20} height={13} />
                        <Text style={styles.langName}>{language.name}</Text>
                      </View>
                      <Text style={styles.langNative}>{language.nativeName}</Text>
                    </View>
                    {active ? (
                      <CustomIcon name="check" size={20} color={Colors.light.primary} />
                    ) : null}
                  </View>
                </AppCard>
              </Pressable>
            );
          }
        )}
      </AppSection>
      <AppSection title={t('settings.note')} accentIndex={2}>
        <InfoBar>
          <Text style={styles.note}>{t('settings.noteBody')}</Text>
          {Platform.OS === 'web' ? (
            <Text style={[styles.note, { marginTop: 8 }]}>
              {t('settings.webSwitchHint')}
            </Text>
          ) : null}
        </InfoBar>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentName: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  currentCode: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  feedback: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  selectedCard: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  langInfo: { flex: 1 },
  langNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langName: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  langNative: { fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  note: { fontSize: 14, color: Colors.light.textSecondary },
});
