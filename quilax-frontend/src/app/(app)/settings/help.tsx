import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import helpService from '@/services/helpService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/ScreenChrome';

export default function HelpCenterScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const isSpanish = (i18n.language || 'es').toLowerCase().startsWith('es');
      if (!isSpanish) {
        const faq = t('settings.faqPage.items', { returnObjects: true }) as Array<{ q: string; a: string }>;
        if (Array.isArray(faq) && faq.length) {
          setArticles(
            faq.map((item, index) => ({
              id: index + 1,
              question: item.q,
              answer: item.a,
            })),
          );
        }
        setLoading(false);
        return;
      }
      const result = await helpService.getArticles();
      if (result.success) {
        setArticles(result.data?.articles || []);
      }
      setLoading(false);
    })();
  }, [i18n.language, t]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    const q = searchQuery.trim().toLowerCase();
    return articles.filter(
      (a) =>
        a.question?.toLowerCase().includes(q) ||
        a.answer?.toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q),
    );
  }, [articles, searchQuery]);

  return (
    <AppScreen>
      <AppHeader
        title={t('settings.help.title')}
        subtitle={t('settings.help.subtitle')}
        showBack
        backHref="/(app)/settings"
      />

      <AppSection title={t('settings.help.searchSection')} accentIndex={0}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('settings.help.searchPlaceholder')}
          placeholderTextColor={Colors.light.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </AppSection>

      <AppSection title={t('settings.help.articlesSection')} accentIndex={1}>
        {loading ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : filteredArticles.length === 0 ? (
          <AppPlaceholder text={t('settings.help.noArticles')} />
        ) : (
          filteredArticles.map((article) => {
            const expanded = expandedId === article.id;
            return (
              <AppCard key={article.id} onPress={() => setExpandedId(expanded ? null : article.id)}>
                <Text style={styles.articleTitle}>{article.question}</Text>
                {article.category ? (
                  <Text style={styles.articleCat}>{article.category}</Text>
                ) : null}
                {expanded ? <Text style={styles.articleAnswer}>{article.answer}</Text> : (
                  <Text style={styles.tapHint}>{t('settings.help.tapToRead')}</Text>
                )}
              </AppCard>
            );
          })
        )}
      </AppSection>

      <AppSection title={t('settings.help.stillUnresolvedSection')} accentIndex={3}>
        <Text style={styles.ctaHint}>{t('settings.help.ctaHint')}</Text>
        <GradientButton
          label={t('settings.help.contactSupport')}
          onPress={() => router.push('/(app)/settings/tickets')}
        />
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 16,
    color: Colors.light.text,
  },
  articleTitle: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  articleCat: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  articleAnswer: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.two,
    lineHeight: 21,
  },
  tapHint: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  ctaHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
});
