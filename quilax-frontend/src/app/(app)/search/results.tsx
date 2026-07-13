import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import searchService from '@/services/searchService';

export default function SearchResultsScreen() {
  const { q = '' } = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{ quizzes: any[]; users: any[] }>({ quizzes: [], users: [] });

  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }
    searchService.search(String(q)).then((result) => {
      if (result.success) {
        const payload = result.data?.results || result.data || {};
        setResults({
          quizzes: payload.quizzes || [],
          users: payload.users || [],
        });
      }
      setLoading(false);
    });
  }, [q]);

  const data = [
    ...results.quizzes.map((item) => ({ type: 'quiz', ...item })),
    ...results.users.map((item) => ({ type: 'user', ...item })),
  ];

  return (
    <AppScreen>
      <AppHeader title="Resultados" subtitle={String(q)} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} color={Colors.light.primary} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={data}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
          renderItem={({ item }) => (
            <AppCard onPress={item.type === 'quiz' ? () => router.push(`/(app)/quiz/${item.id}`) : undefined}>
              <Text style={styles.type}>{item.type === 'quiz' ? 'Quiz' : 'Usuario'}</Text>
              <Text style={styles.title}>{item.title || item.username || item.fullName}</Text>
            </AppCard>
          )}
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
