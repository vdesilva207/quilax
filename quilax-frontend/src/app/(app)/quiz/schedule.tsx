import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel } from '@/components/ui/ScreenChrome';
import { getQuizScheduleYears, buildScheduleDate, isFutureSchedule } from '@/utils/quizScheduleYears';

export default function QuizScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const quizId = params.quizId as string;
  const difficulty = params.difficulty as string;
  const questionsCount = params.questionsCount as string;
  const years = useMemo(() => getQuizScheduleYears(), []);
  const defaultAt = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    return d;
  }, []);

  const [year, setYear] = useState(defaultAt.getFullYear());
  const [month, setMonth] = useState(defaultAt.getMonth() + 1);
  const [day, setDay] = useState(defaultAt.getDate());
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const date = buildScheduleDate(year, month, day, hour, minute);
    if (!isFutureSchedule(date)) {
      setError(t('schedule.futureDateError'));
      return;
    }
    router.push({
      pathname: '/(app)/quiz/confirm',
      params: {
        quizId: quizId || '',
        difficulty,
        questionsCount,
        scheduledAt: date.toISOString(),
      },
    });
  };

  return (
    <AppScreen testID="schedule-screen">
      <AppHeader title={t('schedule.title')} showBack subtitle={t('schedule.subtitle')} />
      <AppSection title={t('schedule.sectionTitle')} accentIndex={0}>
        <AppCard>
          <FieldLabel>{t('schedule.yearLabel')}</FieldLabel>
          <TextInput
            style={styles.input}
            value={String(year)}
            onChangeText={(v) => setYear(Number(v) || years[0])}
            keyboardType="number-pad"
            testID="date-picker"
          />
          <FieldLabel>{t('schedule.monthLabel')}</FieldLabel>
          <TextInput
            style={styles.input}
            value={String(month)}
            onChangeText={(v) => setMonth(Number(v) || 1)}
            keyboardType="number-pad"
          />
          <FieldLabel>{t('schedule.dayLabel')}</FieldLabel>
          <TextInput
            style={styles.input}
            value={String(day)}
            onChangeText={(v) => setDay(Number(v) || 1)}
            keyboardType="number-pad"
          />
          <FieldLabel>{t('schedule.hourLabel')}</FieldLabel>
          <TextInput
            style={styles.input}
            value={String(hour)}
            onChangeText={(v) => setHour(Number(v) || 0)}
            keyboardType="number-pad"
            testID="time-picker"
          />
          <FieldLabel>{t('schedule.minuteLabel')}</FieldLabel>
          <TextInput
            style={styles.input}
            value={String(minute)}
            onChangeText={(v) => setMinute(Number(v) || 0)}
            keyboardType="number-pad"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>
        <GradientButton label={t('schedule.next')} onPress={handleNext} />
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderRadius: 12,
    padding: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    marginBottom: Spacing.two,
    fontSize: 16,
    color: Colors.light.text,
  },
  error: { color: Colors.light.error, marginBottom: Spacing.two, fontWeight: '600' },
});
