import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard } from '@/components/ui/AppScreen';
import { getQuizScheduleYears, buildScheduleDate, isFutureSchedule } from '@/utils/quizScheduleYears';

export default function QuizScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const difficulty = params.difficulty as string;
  const questionsCount = params.questionsCount as string;
  const years = useMemo(() => getQuizScheduleYears(), []);

  const [year, setYear] = useState(years[0]);
  const [month, setMonth] = useState(7);
  const [day, setDay] = useState(15);
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    const date = buildScheduleDate(year, month, day, hour, minute);
    if (!isFutureSchedule(date)) {
      setError('La fecha debe ser futura');
      return;
    }
    router.push({
      pathname: '/(app)/quiz/confirm',
      params: {
        difficulty,
        questionsCount,
        scheduledAt: date.toISOString(),
      },
    });
  };

  return (
    <AppScreen testID="schedule-screen">
      <AppHeader title="Programar quiz" subtitle="Elige fecha y hora de publicación" />
      <View style={styles.body}>
        <AppCard>
          <Text style={styles.label}>Año</Text>
          <TextInput style={styles.input} value={String(year)} onChangeText={(v) => setYear(Number(v) || years[0])} keyboardType="number-pad" testID="date-picker" />
          <Text style={styles.label}>Mes</Text>
          <TextInput style={styles.input} value={String(month)} onChangeText={(v) => setMonth(Number(v) || 1)} keyboardType="number-pad" />
          <Text style={styles.label}>Día</Text>
          <TextInput style={styles.input} value={String(day)} onChangeText={(v) => setDay(Number(v) || 1)} keyboardType="number-pad" />
          <Text style={styles.label}>Hora</Text>
          <TextInput style={styles.input} value={String(hour)} onChangeText={(v) => setHour(Number(v) || 0)} keyboardType="number-pad" testID="time-picker" />
          <Text style={styles.label}>Minuto</Text>
          <TextInput style={styles.input} value={String(minute)} onChangeText={(v) => setMinute(Number(v) || 0)} keyboardType="number-pad" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>
        <Pressable style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>Siguiente</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.four },
  label: { fontWeight: '700', color: Colors.light.text, marginBottom: Spacing.one, marginTop: Spacing.two },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 10,
    padding: Spacing.three,
    backgroundColor: '#fff',
  },
  error: { color: Colors.light.error, marginTop: Spacing.two },
  btn: {
    marginTop: Spacing.four,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
