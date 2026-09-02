import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';
import { normalizeAppLanguage, type AppLanguage } from '@/i18n';

import privacyEs from '@/i18n/legal/privacy.es.json';
import privacyEn from '@/i18n/legal/privacy.en.json';
import privacyFr from '@/i18n/legal/privacy.fr.json';
import privacyDe from '@/i18n/legal/privacy.de.json';
import privacyPt from '@/i18n/legal/privacy.pt.json';

type Section = { title: string; body: string };

const PRIVACY_BY_LANG: Record<AppLanguage, Section[]> = {
  es: privacyEs as Section[],
  en: privacyEn as Section[],
  fr: privacyFr as Section[],
  de: privacyDe as Section[],
  pt: privacyPt as Section[],
};

function parseMarkdownSections(content: string, fallback: Section[]) {
  const lines = String(content || '').split('\n');
  const sections: Section[] = [];
  let title = '';
  let body: string[] = [];
  const flush = () => {
    if (title) sections.push({ title, body: body.join(' ').trim() });
    title = '';
    body = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      flush();
      title = line.replace(/^##\s+/, '');
    } else if (line.startsWith('# ')) {
      // skip
    } else if (line.startsWith('- ')) {
      body.push(line.replace(/^- /, '• '));
    } else if (line) {
      body.push(line);
    }
  }
  flush();
  return sections.length ? sections : fallback;
}

export default function PrivacyPolicyScreen() {
  const { t, i18n } = useTranslation();
  const lang = useMemo(() => normalizeAppLanguage(i18n.language), [i18n.language]);
  const fallbackSections = PRIVACY_BY_LANG[lang];
  const [sections, setSections] = useState<Section[]>(fallbackSections);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // API only serves Spanish markdown; use translated fallbacks for other languages.
    if (lang !== 'es') {
      setSections(PRIVACY_BY_LANG[lang]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiClient.get('/legal/privacy-policy');
      if (data?.content) setSections(parseMarkdownSections(data.content, PRIVACY_BY_LANG.es));
      else setSections(PRIVACY_BY_LANG.es);
    } catch {
      setSections(PRIVACY_BY_LANG.es);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen>
      <AppHeader title={t('settings.privacyPage.title')} showBack backHref="/(app)/settings" />
      <AppSection title={t('settings.privacyPage.introSection')} accentIndex={0}>
        <Text style={styles.intro}>{t('settings.privacyPage.intro')}</Text>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: Spacing.four }} />
        ) : (
          sections.map((section) => (
            <AppCard key={section.title}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.text}>{section.body}</Text>
            </AppCard>
          ))
        )}
        <Text style={styles.footer}>
          {t('settings.privacyPage.footer', { date: t('settings.privacyPage.footerDate') })}
        </Text>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  intro: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.two,
  },
  sectionTitle: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  text: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  footer: {
    marginTop: Spacing.three,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
