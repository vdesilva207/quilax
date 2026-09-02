import React, { useState } from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, bodyTypeface } from '@/constants/theme';
import {
  AuthFlowLayout,
  AuthPrimaryButton,
  AuthCard,
  AuthProgressDots,
} from '@/components/ui/AuthFlowLayout';
import { APP_LANGUAGES, AppLanguage, normalizeAppLanguage, setAppLanguage } from '@/i18n';
import { AppLanguageFlags } from '@/components/FlagIcons';

const LANGUAGES: { code: AppLanguage; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'it', label: 'Italiano' },
];

export default function LanguageSelectionScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<AppLanguage>(
    normalizeAppLanguage(i18n.language)
  );

  const handleContinue = async () => {
    await setAppLanguage(selected);
    router.push('/(auth)/onboarding');
  };

  return (
    <AuthFlowLayout
      title={t('auth.chooseLanguage')}
      subtitle={t('auth.chooseLanguageSubtitle')}
      badge="1"
      showBack
    >
      <AuthProgressDots total={5} current={0} />
      {LANGUAGES.filter((l) => (APP_LANGUAGES as readonly string[]).includes(l.code)).map(
        (lang) => (
          <AuthCard key={lang.code}>
            <Pressable
              onPress={async () => {
                setSelected(lang.code);
                await setAppLanguage(lang.code);
              }}
              style={styles.optionRow}
            >
              <AppLanguageFlags code={lang.code} width={22} height={14} />
              <Text style={[styles.option, selected === lang.code && styles.optionActive]}>
                {lang.label}
              </Text>
            </Pressable>
          </AuthCard>
        )
      )}
      <AuthPrimaryButton label={t('common.continue')} onPress={handleContinue} />
    </AuthFlowLayout>
  );
}

const styles = StyleSheet.create({
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  option: { ...bodyTypeface, fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  optionActive: { color: Colors.light.primary, fontWeight: '700' },
});
