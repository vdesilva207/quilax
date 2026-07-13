import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import quizService from '@/services/quizService';
import apiClient from '@/lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState([]);
  const [homeData, setHomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [quizResult, homeResult] = await Promise.all([
        quizService.getPublicQuizzes(),
        apiClient.get('/home').catch(() => null),
      ]);

      if (quizResult.success) {
        setQuizzes(quizResult.data || []);
      }
      if (homeResult?.data) {
        setHomeData(homeResult.data);
      } else if (homeResult) {
        setHomeData(homeResult);
      }
    } catch (error) {
      console.error('Home load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered} testID="home-screen">
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="home-screen"
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}>
      <Text style={styles.heading}>Quilax</Text>
      <Text style={styles.subheading}>Quizzes en vivo</Text>

      {homeData?.seasonRanking?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top temporada</Text>
          {homeData.seasonRanking.slice(0, 5).map((entry: any) => (
            <Text key={entry.id} style={styles.itemText}>
              {entry.user?.username || entry.user?.fullName || `User ${entry.userId}`} — {entry.points ?? entry.rank} pts
            </Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quizzes publicados</Text>
        {quizzes.length === 0 ? (
          <Text style={styles.empty}>No hay quizzes disponibles</Text>
        ) : (
          quizzes.map((quiz) => (
            <Pressable
              key={quiz.id}
              style={styles.card}
              onPress={() => router.push(`/(app)/quiz/${quiz.id}`)}>
              <Text style={styles.cardTitle}>{quiz.title}</Text>
              <Text style={styles.cardMeta}>{quiz.status}</Text>
            </Pressable>
          ))
        )}
      </View>

      <Pressable style={styles.createButton} onPress={() => router.push('/(app)/quiz/create')}>
        <Text style={styles.createButtonText}>Crear quiz</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: Spacing.four },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 32, fontWeight: 'bold', color: Colors.light.text },
  subheading: { fontSize: 16, color: Colors.light.textSecondary, marginBottom: Spacing.four },
  section: { marginBottom: Spacing.five },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.two, color: Colors.light.text },
  itemText: { fontSize: 14, color: Colors.light.text, marginBottom: Spacing.one },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: 12,
    marginBottom: Spacing.two,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
  cardMeta: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 4 },
  empty: { color: Colors.light.textSecondary },
  createButton: {
    backgroundColor: Colors.light.primary,
    padding: Spacing.four,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
