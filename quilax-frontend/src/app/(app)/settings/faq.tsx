import { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';

type FaqItem = { q: string; a: string };

type HelpArticle = {
  id: number;
  question: string;
  answer: string;
  category?: string;
};

export default function FaqScreen() {
  const { t, i18n } = useTranslation();
  const fallbackItems = t('settings.faqPage.items', { returnObjects: true }) as FaqItem[];
  const [items, setItems] = useState<FaqItem[]>(Array.isArray(fallbackItems) ? fallbackItems : []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isSpanish = (i18n.language || 'es').toLowerCase().startsWith('es');
    const localItems = t('settings.faqPage.items', { returnObjects: true }) as FaqItem[];
    (async () => {
      try {
        // Help articles in DB are Spanish-only today; keep i18n copy for other locales.
        if (!isSpanish) {
          setItems(Array.isArray(localItems) ? localItems : []);
          return;
        }
        const data = await apiClient.get('/help/articles?limit=100');
        const articles = (data?.articles || []) as HelpArticle[];
        if (articles.length) {
          setItems(
            articles.map((a) => ({
              q: a.question,
              a: a.answer,
            })),
          );
        } else if (Array.isArray(localItems)) {
          setItems(localItems);
        }
      } catch {
        if (Array.isArray(localItems)) setItems(localItems);
      } finally {
        setLoading(false);
      }
    })();
  }, [i18n.language, t]);

  return (
    <AppScreen>
      <AppHeader title={t('settings.faqPage.title')} showBack backHref="/(app)/settings" />
      {loading ? (
        <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.four }} />
      ) : (
        items.map((item, index) => (
          <AppSection key={`${item.q}-${index}`} title={item.q} accentIndex={index % 4}>
            <AppCard>
              <Text style={styles.answer}>{item.a}</Text>
            </AppCard>
          </AppSection>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  answer: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
  },
});
