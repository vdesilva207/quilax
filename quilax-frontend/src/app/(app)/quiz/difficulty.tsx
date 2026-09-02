import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton } from '@/components/ui/ScreenChrome';

export default function DifficultyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const quizId = params.quizId as string;
  const questionsCount = params.questionsCount as string;
  const [difficulty, setDifficulty] = useState<number>(5);

  const handleNext = () => {
    router.push({
      pathname: '/(app)/quiz/schedule',
      params: {
        quizId: quizId || '',
        difficulty: difficulty.toString(),
        questionsCount: questionsCount || '0',
      },
    });
  };

  return (
    <AppScreen>
      <AppHeader title={t('difficulty.title')} showBack subtitle={t('difficulty.subtitle')} />
      <AppSection title={t('difficulty.chooseLevelSection')} accentIndex={0}>
        <View style={styles.grid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
            const active = difficulty === level;
            return (
              <AppCard
                key={level}
                onPress={() => setDifficulty(level)}
                style={active ? { ...styles.levelCard, ...styles.levelCardActive } : styles.levelCard}
              >
                <Text style={[styles.levelText, active && styles.levelTextActive]}>{level}</Text>
              </AppCard>
            );
          })}
        </View>
        <Text style={styles.selected}>{t('difficulty.selected', { n: difficulty })}</Text>
        <GradientButton label={t('difficulty.next')} onPress={handleNext} />
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  levelCard: {
    width: '18.5%',
    maxWidth: 72,
    alignItems: 'center',
    paddingVertical: Spacing.three,
    marginBottom: 0,
  },
  levelCardActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  levelTextActive: {
    color: '#FFFFFF',
  },
  selected: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
});
