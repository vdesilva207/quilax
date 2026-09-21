import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, FieldLabel, InfoBar } from '@/components/ui/ScreenChrome';
import {
  getQuizScheduleYears,
  buildScheduleDate,
  getMinScheduleDate,
  isValidCreatorSchedule,
  daysInMonth,
  clampScheduleParts,
  QUIZ_SCHEDULE_MIN_LEAD_DAYS,
  QUIZ_SCHEDULE_HOURS,
  QUIZ_SCHEDULE_MINUTE_STEPS,
} from '@/utils/quizScheduleYears';
import { formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';

function ChipRow({
  values,
  selected,
  onSelect,
  formatLabel,
  testID,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  formatLabel?: (v: number) => string;
  testID?: string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      testID={testID}
    >
      {values.map((v) => {
        const active = v === selected;
        return (
          <Pressable
            key={v}
            onPress={() => onSelect(v)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {formatLabel ? formatLabel(v) : String(v)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function QuizScheduleScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const quizId = params.quizId as string;
  const difficulty = params.difficulty as string;
  const questionsCount = params.questionsCount as string;

  const years = useMemo(() => getQuizScheduleYears(), []);
  const minAt = useMemo(() => getMinScheduleDate(), []);
  const timeZone = useMemo(() => resolveViewerTimezone(), []);

  const defaultAt = useMemo(() => {
    const d = getMinScheduleDate();
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < minAt.getTime()) return new Date(minAt);
    return d;
  }, [minAt]);

  const initial = useMemo(
    () =>
      clampScheduleParts({
        year: defaultAt.getFullYear(),
        month: defaultAt.getMonth() + 1,
        day: defaultAt.getDate(),
        hour: defaultAt.getHours(),
        minute: defaultAt.getMinutes(),
      }),
    [defaultAt]
  );

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [error, setError] = useState<string | null>(null);

  const dayOptions = useMemo(() => {
    const max = daysInMonth(year, month);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [year, month]);

  useEffect(() => {
    const max = daysInMonth(year, month);
    if (day > max) setDay(max);
  }, [year, month, day]);

  const previewDate = useMemo(
    () => buildScheduleDate(year, month, day, hour, minute),
    [year, month, day, hour, minute]
  );

  const preview = useMemo(
    () => formatQuizStart(previewDate, timeZone),
    [previewDate, timeZone]
  );

  const monthLabels = useMemo(() => {
    const locale = i18n.language || 'es';
    return Array.from({ length: 12 }, (_, i) => {
      const name = new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(2020, i, 1)
      );
      return { value: i + 1, label: name };
    });
  }, [i18n.language]);

  const handleNext = () => {
    const date = buildScheduleDate(year, month, day, hour, minute);
    if (Number.isNaN(date.getTime())) {
      setError(t('schedule.invalidDateError'));
      return;
    }
    if (!isValidCreatorSchedule(date)) {
      setError(t('schedule.minLeadError', { days: QUIZ_SCHEDULE_MIN_LEAD_DAYS }));
      return;
    }
    setError(null);
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
        <InfoBar>
          <Text style={styles.hint}>
            {t('schedule.minLeadHint', { days: QUIZ_SCHEDULE_MIN_LEAD_DAYS })}
          </Text>
          <Text style={styles.tzHint}>
            {t('schedule.timezoneHint', {
              tz: timeZone,
              abbr: preview.timeZoneAbbr || timeZone,
            })}
          </Text>
        </InfoBar>

        <AppCard>
          <FieldLabel>{t('schedule.yearLabel')}</FieldLabel>
          <ChipRow
            values={years}
            selected={year}
            onSelect={setYear}
            testID="date-picker"
          />

          <FieldLabel>{t('schedule.monthLabel')}</FieldLabel>
          <ChipRow
            values={monthLabels.map((m) => m.value)}
            selected={month}
            onSelect={setMonth}
            formatLabel={(v) => monthLabels.find((m) => m.value === v)?.label || String(v)}
          />

          <FieldLabel>{t('schedule.dayLabel')}</FieldLabel>
          <ChipRow values={dayOptions} selected={day} onSelect={setDay} />

          <FieldLabel>{t('schedule.hourLabel')}</FieldLabel>
          <ChipRow
            values={[...QUIZ_SCHEDULE_HOURS]}
            selected={hour}
            onSelect={setHour}
            formatLabel={(v) => String(v).padStart(2, '0')}
            testID="time-picker"
          />

          <FieldLabel>{t('schedule.minuteLabel')}</FieldLabel>
          <ChipRow
            values={[...QUIZ_SCHEDULE_MINUTE_STEPS]}
            selected={minute}
            onSelect={setMinute}
            formatLabel={(v) => String(v).padStart(2, '0')}
          />

          <View style={styles.previewBox}>
            <Text style={styles.previewLabel}>{t('schedule.previewLabel')}</Text>
            <Text style={styles.previewValue}>{preview.fullLabel}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </AppCard>
        <GradientButton label={t('schedule.next')} onPress={handleNext} />
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  hint: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20 },
  tzHint: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingBottom: Spacing.two,
    marginBottom: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    minWidth: 44,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  chipTextActive: { color: '#FFFFFF' },
  previewBox: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
    gap: 4,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 22,
  },
  error: { color: Colors.light.error, marginTop: Spacing.two, fontWeight: '600' },
});
