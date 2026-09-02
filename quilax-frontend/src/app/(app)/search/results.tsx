import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import { QuizCard } from '@/components/QuizCard';
import searchService from '@/services/searchService';

export default function SearchResultsScreen() {
  const { q = '', category } = useLocalSearchParams<{ q?: string; category?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{ quizzes: any[]; users: any[] }>({ quizzes: [], users: [] });

  const query = String(q || '').trim();
  const cat = category ? String(category) : undefined;
  const subtitle = [query, cat].filter(Boolean).join(' · ') || t('search.defaultQuery');

  useEffect(() => {
    if (!query && !cat) {
      setLoading(false);
      return;
    }
    setLoading(true);
    searchService.search(query, 'all', cat).then((result) => {
      if (result.success) {
        const payload = result.data?.results || result.data || {};
        setResults({
          quizzes: payload.quizzes || [],
          users: payload.users || [],
        });
      }
      setLoading(false);
    });
  }, [query, cat]);

  const data = [
    ...results.quizzes.map((item) => ({ type: 'quiz' as const, ...item })),
    ...results.users.map((item) => ({ type: 'user' as const, ...item })),
  ];

  return (
    <AppScreen>
      <AppHeader title={t('search.resultsTitle')} subtitle={subtitle} showBack backHref="/(app)/search" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} color={Colors.light.primary} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={data}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          ListEmptyComponent={<Text style={styles.empty}>{t('search.noResults')}</Text>}
          renderItem={({ item, index }) =>
            item.type === 'quiz' ? (
              <QuizCard
                staggerIndex={index}
                title={item.title}
                category={item.category}
                language={item.language}
                onPress={() => router.push(`/(app)/quiz/${item.id}`)}
              />
            ) : (
              <AppCard onPress={() => router.push(`/(app)/profile/${item.id}` as any)}>
                <Text style={styles.type}>{t('search.user')}</Text>
                <Text style={styles.title}>{item.username || item.fullName}</Text>
              </AppCard>
            )
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six },
  type: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginTop: Spacing.one },
  empty: { textAlign: 'center', color: Colors.light.textSecondary, marginTop: Spacing.four },
});
