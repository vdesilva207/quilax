import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import searchService from '@/services/searchService';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ quizzes: [], users: [] });
  const [loading, setLoading] = useState(false);

  const runSearch = async (text) => {
    setQuery(text);
    if (!text.trim()) {
      setResults({ quizzes: [], users: [] });
      return;
    }

    setLoading(true);
    const result = await searchService.search(text);
    if (result.success) {
      setResults(result.data);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buscar</Text>
      <TextInput
        style={styles.input}
        placeholder="Quizzes, usuarios..."
        value={query}
        onChangeText={runSearch}
        placeholderTextColor={Colors.light.textSecondary}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : (
        <FlatList
          data={[
            ...results.quizzes.map((q) => ({ type: 'quiz', ...q })),
            ...results.users.map((u) => ({ type: 'user', ...u })),
          ]}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardType}>{item.type === 'quiz' ? 'Quiz' : 'Usuario'}</Text>
              <Text style={styles.cardTitle}>{item.title || item.username || item.fullName || item.email}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Sin resultados</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, backgroundColor: Colors.light.background },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: Spacing.three },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  card: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  cardType: { fontSize: 12, color: Colors.light.textSecondary },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  empty: { color: Colors.light.textSecondary, textAlign: 'center', marginTop: Spacing.four },
});
