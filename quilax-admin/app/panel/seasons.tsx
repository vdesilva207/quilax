import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import apiClient from '@/lib/api';

export default function SeasonsScreen() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/seasons/history').then((data) => {
      setSeasons(data.seasons || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <AppScreen>
      <AppHeader title="Temporadas" subtitle="Historial y temporada activa" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : (
        <View style={styles.list}>
          {seasons.map((season) => (
            <View key={season.id} style={styles.item}>
              <Text style={styles.name}>{season.name}</Text>
              <Text style={styles.meta}>
                Jackpot: {season.jackpotPool ?? 0} cr · {new Date(season.startsAt).toLocaleDateString()} – {new Date(season.endsAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.four, gap: Spacing.two },
  item: { padding: Spacing.three, backgroundColor: Colors.light.backgroundElement, borderRadius: 12 },
  name: { fontWeight: '700', fontSize: 16 },
  meta: { color: Colors.light.textSecondary, marginTop: 4 },
});
