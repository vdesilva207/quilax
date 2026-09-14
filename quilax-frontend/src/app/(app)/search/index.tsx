import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import { QUIZ_CATEGORIES, getCategoryStyle, getCategoryLabel } from '@/constants/quizCategories';
import { AppScreen, AppHeader, AppSection } from '@/components/ui/AppScreen';

export default function SearchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const goToResults = (text: string, category?: string | null) => {
    const q = text.trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    const qs = params.toString();
    router.push(`/(app)/search/results${qs ? `?${qs}` : ''}` as any);
  };

  return (
    <AppScreen>
      <AppHeader title={t('search.title')} subtitle={t('search.subtitle')} />

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.input}
          placeholder={t('search.typeSomething')}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            if (query.trim()) goToResults(query);
          }}
          returnKeyType="search"
          placeholderTextColor={Colors.light.textSecondary}
        />
      </View>

      <AppSection title={t('search.categories')} accentIndex={0}>
        <View style={styles.grid}>
          {QUIZ_CATEGORIES.map((cat) => {
            const pastel = getCategoryStyle(cat);
            return (
              <Pressable
                key={cat}
                style={[
                  styles.chip,
                  {
                    backgroundColor: pastel.bg,
                    borderColor: pastel.border,
                  },
                ]}
                onPress={() => goToResults(query, cat)}
              >
                <Text style={[styles.chipText, { color: pastel.text }]}>{getCategoryLabel(cat, t)}</Text>
              </Pressable>
            );
          })}
        </View>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  input: {
    ...bodyTypeface,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.12)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.text,
    shadowColor: '#1C1917',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { ...bodyTypeface, fontSize: 13, fontWeight: '600' },
});
