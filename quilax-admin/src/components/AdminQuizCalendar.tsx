import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import { getSelectableQuizYears } from '@/utils/quizScheduleYears';
import { AppHeader, AppSection } from '@/components/ui/AppScreen';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface MinuteSlot {
  minute: string;
  status: ReviewStatus;
  quizId: number;
  quizTitle: string;
  rawStatus?: string;
}

interface OccupiedDate {
  date: string;
  hours: Record<
    string,
    {
      hour: string;
      minutes: Record<string, MinuteSlot>;
    }
  >;
}

interface AdminQuizCalendarProps {
  onQuizSelect?: (quiz: MinuteSlot) => void;
}

function aggregateStatuses(statuses: ReviewStatus[]): ReviewStatus | null {
  if (!statuses.length) return null;
  if (statuses.some((s) => s === 'PENDING')) return 'PENDING';
  if (statuses.every((s) => s === 'REJECTED')) return 'REJECTED';
  return 'APPROVED';
}

function statusStyle(status: ReviewStatus | null) {
  if (status === 'PENDING') return styles.pickerOptionPending;
  if (status === 'APPROVED') return styles.pickerOptionApproved;
  if (status === 'REJECTED') return styles.pickerOptionRejected;
  return null;
}

function statusTextStyle(status: ReviewStatus | null) {
  if (status === 'PENDING') return styles.pickerOptionTextPending;
  if (status === 'APPROVED') return styles.pickerOptionTextApproved;
  if (status === 'REJECTED') return styles.pickerOptionTextRejected;
  return null;
}

export default function AdminQuizCalendar({ onQuizSelect }: AdminQuizCalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [occupiedDates, setOccupiedDates] = useState<OccupiedDate[]>([]);
  const [yearStatus, setYearStatus] = useState<ReviewStatus | null>(null);
  const [monthStatuses, setMonthStatuses] = useState<Record<string, ReviewStatus>>({});
  const [selectedQuizzes, setSelectedQuizzes] = useState<MinuteSlot[]>([]);

  const years = getSelectableQuizYears();
  const months = [
    { value: 1, label: 'Ene' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Ago' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dic' },
  ];
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const fetchYearSummary = useCallback(async () => {
    try {
      const response = await authFetch(`/admin/quizzes/occupied-dates?year=${year}`);
      const data = await response.json();
      if (data.success) {
        setYearStatus(data.yearStatus ?? null);
        setMonthStatuses(data.monthStatuses ?? {});
      }
    } catch (error) {
      console.error('Error fetching year summary:', error);
    }
  }, [year]);

  const fetchMonthDetails = useCallback(async () => {
    if (!month) return;
    try {
      const monthValue = parseInt(month, 10);
      const response = await authFetch(
        `/admin/quizzes/occupied-dates?year=${year}&month=${monthValue}`,
      );
      const data = await response.json();
      if (data.success) {
        setOccupiedDates(data.occupiedDates ?? []);
        setMonthStatuses((prev) => ({ ...prev, ...(data.monthStatuses ?? {}) }));
      }
    } catch (error) {
      console.error('Error fetching occupied dates:', error);
    }
  }, [year, month]);

  useEffect(() => {
    fetchYearSummary();
    setMonth('');
    setDay('');
    setHour('');
    setMinute('');
    setOccupiedDates([]);
  }, [year, fetchYearSummary]);

  useEffect(() => {
    if (month) {
      fetchMonthDetails();
      setDay('');
      setHour('');
      setMinute('');
    }
  }, [month, fetchMonthDetails]);

  const getDayStatus = (d: number): ReviewStatus | null => {
    const dateKey = `${year}-${month}-${d}`;
    const occupiedDate = occupiedDates.find((od) => od.date === dateKey);
    if (!occupiedDate) return null;

    const statuses: ReviewStatus[] = [];
    Object.values(occupiedDate.hours).forEach((hourData) => {
      Object.values(hourData.minutes).forEach((m) => statuses.push(m.status));
    });
    return aggregateStatuses(statuses);
  };

  const getHourStatus = (d: number, h: number): ReviewStatus | null => {
    const dateKey = `${year}-${month}-${d}`;
    const occupiedDate = occupiedDates.find((od) => od.date === dateKey);
    if (!occupiedDate) return null;

    const hourData = occupiedDate.hours[h.toString()];
    if (!hourData) return null;

    const statuses = Object.values(hourData.minutes).map((m) => m.status);
    return aggregateStatuses(statuses);
  };

  const getMinuteStatus = (d: number, h: number, m: number): ReviewStatus | null => {
    const dateKey = `${year}-${month}-${d}`;
    const occupiedDate = occupiedDates.find((od) => od.date === dateKey);
    if (!occupiedDate) return null;

    const hourData = occupiedDate.hours[h.toString()];
    if (!hourData) return null;

    return hourData.minutes[m.toString()]?.status ?? null;
  };

  const handleMinuteSelect = (m: number) => {
    if (!year || !month || !day || !hour) return;

    const dateKey = `${year}-${month}-${day}`;
    const occupiedDate = occupiedDates.find((od) => od.date === dateKey);
    const minuteData = occupiedDate?.hours[hour]?.minutes[m.toString()];
    if (!minuteData) return;

    setMinute(m.toString());
    setSelectedQuizzes([minuteData]);
    onQuizSelect?.(minuteData);
  };

  const renderPickerOption = (
    key: string | number,
    label: string,
    status: ReviewStatus | null,
    onPress: () => void,
    size: 'sm' | 'md' = 'md',
  ) => (
    <Pressable
      key={key}
      style={[
        size === 'sm' ? styles.pickerOptionSm : styles.pickerOption,
        statusStyle(status),
      ]}
      onPress={onPress}
    >
      <Text style={[styles.pickerOptionText, statusTextStyle(status)]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppHeader title="Quizzes" subtitle="Calendario de revisión" badge="Admin" />

      <AppSection title="Año" accentIndex={0}>
        <View style={styles.pickerContainer}>
          {years.map((y) =>
            renderPickerOption(y, String(y), year === y ? yearStatus : null, () => setYear(y)),
          )}
        </View>
      </AppSection>

      <AppSection title="Mes" accentIndex={1}>
        <View style={styles.monthPickerContainer}>
          {months.map((m) =>
            renderPickerOption(
              m.value,
              m.label,
              monthStatuses[String(m.value)] ?? null,
              () => setMonth(String(m.value)),
              'sm',
            ),
          )}
        </View>
      </AppSection>

      {month ? (
        <AppSection title="Día" accentIndex={2}>
          <View style={styles.pickerContainer}>
            {days.map((d) =>
              renderPickerOption(d, String(d), getDayStatus(d), () => {
                setDay(String(d));
                setHour('');
                setMinute('');
              }),
            )}
          </View>
        </AppSection>
      ) : null}

      {day ? (
        <AppSection title="Hora" accentIndex={0}>
          <View style={styles.pickerContainer}>
            {hours.map((h) =>
              renderPickerOption(
                h,
                h.toString().padStart(2, '0'),
                getHourStatus(parseInt(day, 10), h),
                () => {
                  setHour(String(h));
                  setMinute('');
                },
              ),
            )}
          </View>
        </AppSection>
      ) : null}

      {hour ? (
        <AppSection title="Minuto" accentIndex={1}>
          <View style={styles.pickerContainer}>
            {minutes.map((m) =>
              renderPickerOption(
                m,
                m.toString().padStart(2, '0'),
                getMinuteStatus(parseInt(day, 10), parseInt(hour, 10), m),
                () => handleMinuteSelect(m),
              ),
            )}
          </View>
        </AppSection>
      ) : null}

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendPending]} />
          <Text style={styles.legendText}>Pendiente de revisión</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendApproved]} />
          <Text style={styles.legendText}>Todo revisado (aprobado)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, styles.legendRejected]} />
          <Text style={styles.legendText}>Todo revisado (rechazado)</Text>
        </View>
      </View>

      {selectedQuizzes.length > 0 ? (
        <AppSection title="Quiz seleccionado" accentIndex={2}>
          {selectedQuizzes.map((quiz) => (
            <View key={quiz.quizId} style={styles.quizCard}>
              <Text style={styles.quizTitle}>{quiz.quizTitle || 'Sin título'}</Text>
              <Text style={styles.quizStatus}>Estado: {quiz.rawStatus ?? quiz.status}</Text>
            </View>
          ))}
        </AppSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.six,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  monthPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pickerOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionSm: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionPending: {
    backgroundColor: '#FF9999',
    borderColor: '#F87171',
  },
  pickerOptionApproved: {
    backgroundColor: '#4CAF50',
    borderColor: '#22C55E',
  },
  pickerOptionRejected: {
    backgroundColor: '#9E9E9E',
    borderColor: '#64748B',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pickerOptionTextPending: {
    color: '#FFFFFF',
  },
  pickerOptionTextApproved: {
    color: '#FFFFFF',
  },
  pickerOptionTextRejected: {
    color: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.five,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: 'rgba(99,102,241,0.12)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legendColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  legendPending: {
    backgroundColor: '#FF9999',
  },
  legendApproved: {
    backgroundColor: '#4CAF50',
  },
  legendRejected: {
    backgroundColor: '#9E9E9E',
  },
  legendText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  quizCard: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.12)',
  },
  quizTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  quizStatus: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
