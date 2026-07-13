import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import matchesService from '@/services/matchesService';

export default function MatchesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchesService.getRecentMatches().then((result) => {
      if (result.success) setItems(result.data || []);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen>
      <AppHeader title="Partidas" subtitle="Tu actividad reciente en quizzes" />
      <View style={styles.body}>
        {items.length === 0 ? (
          <AppCard><Text style={styles.empty}>Aún no has participado en quizzes.</Text></AppCard>
        ) : (
          items.map((item) => (
            <AppCard key={item.id}>
              <Text style={styles.title}>{item.quiz?.title || `Run #${item.id}`}</Text>
              <Text style={styles.meta}>{item.phase || item.status || 'Actividad reciente'}</Text>
            </AppCard>
          ))
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: Spacing.four },
  title: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  meta: { marginTop: Spacing.one, color: Colors.light.textSecondary },
  empty: { color: Colors.light.textSecondary },
});
