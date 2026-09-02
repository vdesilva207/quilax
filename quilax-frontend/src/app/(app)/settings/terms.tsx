import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';
import { getDateLocale } from '@/utils/timezone';
import { normalizeAppLanguage, type AppLanguage } from '@/i18n';

import termsEs from '@/i18n/legal/terms.es.json';
import termsEn from '@/i18n/legal/terms.en.json';
import termsFr from '@/i18n/legal/terms.fr.json';
import termsDe from '@/i18n/legal/terms.de.json';
import termsPt from '@/i18n/legal/terms.pt.json';

type Section = { title: string; body: string };

const TERMS_BY_LANG: Record<AppLanguage, Section[]> = {
  es: termsEs as Section[],
  en: termsEn as Section[],
  fr: termsFr as Section[],
  de: termsDe as Section[],
  pt: termsPt as Section[],
};

function parseMarkdownSections(content: string, fallback: Section[]) {
  const lines = String(content || '').split('\n');
  const sections: Section[] = [];
  let title = '';
  let body: string[] = [];

  const flush = () => {
    if (title) {
      sections.push({ title, body: body.join('\n').trim() });
    }
    title = '';
    body = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      flush();
      title = trimmed.replace(/^##\s+/, '');
    } else if (trimmed.startsWith('# ')) {
      // skip H1
    } else if (trimmed.startsWith('### ')) {
      body.push('');
      body.push(trimmed.replace(/^###\s+/, ''));
    } else if (trimmed.startsWith('- ')) {
      body.push(`• ${trimmed.slice(2)}`);
    } else if (trimmed === '') {
      if (body.length && body[body.length - 1] !== '') body.push('');
    } else {
      body.push(trimmed);
    }
  }
  flush();
  return sections.length ? sections : fallback;
}

export default function TermsScreen() {
  const { t, i18n } = useTranslation();
  const lang = useMemo(() => normalizeAppLanguage(i18n.language), [i18n.language]);
  const isSpanish = lang === 'es';
  const fallbackSections = TERMS_BY_LANG[lang];
  const [sections, setSections] = useState<Section[]>(fallbackSections);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(t('settings.termsPage.defaultUpdatedDate'));

  const load = useCallback(async () => {
    setLoading(true);
    // API only serves Spanish markdown; use translated fallbacks for other languages.
    if (!isSpanish) {
      setSections(TERMS_BY_LANG[lang]);
      setUpdatedAt(t('settings.termsPage.defaultUpdatedDate'));
      setLoading(false);
      return;
    }
    try {
      const data = await apiClient.get('/legal/terms-of-service');
      if (data?.content) setSections(parseMarkdownSections(data.content, TERMS_BY_LANG.es));
      else setSections(TERMS_BY_LANG.es);
      if (data?.updatedAt) {
        const d = new Date(data.updatedAt);
        if (!Number.isNaN(d.getTime())) {
          setUpdatedAt(
            d.toLocaleDateString(getDateLocale(lang), {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          );
        }
      }
    } catch {
      setSections(TERMS_BY_LANG.es);
    } finally {
      setLoading(false);
    }
  }, [isSpanish, lang, t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen>
      <AppHeader
        title={t('settings.termsPage.title')}
        subtitle={t('settings.termsPage.subtitle')}
        showBack
        backHref="/(app)/settings"
      />
      <AppSection title={t('settings.termsPage.sectionTitle')} accentIndex={0}>
        <Text style={styles.intro}>{t('settings.termsPage.intro')}</Text>
        {!isSpanish ? (
          <Text style={styles.officialNote}>{t('settings.termsPage.officialLanguageNote')}</Text>
        ) : null}
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
        <Text style={styles.footer}>{t('settings.termsPage.footer', { date: updatedAt })}</Text>
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
  officialNote: {
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.light.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  text: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
  },
  footer: {
    marginTop: Spacing.three,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
