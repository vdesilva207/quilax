import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { authFetch } from '@/lib/api';
import { getSelectableQuizYears } from '@/utils/quizScheduleYears';
import { AppHeader, AppSection } from '@/components/ui/AppScreen';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FREE';

interface MinuteSlot {
  minute: string;
  status: ReviewStatus;
  quizId: number;
  quizTitle: string;
  rawStatus?: string;
  aiReviewStatus?: string | null;
  aiReviewReason?: string | null;
  reviewedBy?: string | null;
  prizePoolTotal?: number | null;
  entryCost?: number;
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

export type AdminQuizCalendarHandle = {
  refresh: () => void;
};

interface AdminQuizCalendarProps {
  onQuizSelect?: (quiz: MinuteSlot) => void;
}

function normalizeStatus(raw: unknown): ReviewStatus | null {
  if (raw == null) return null;
  const s = String(raw).toUpperCase();
  if (s === 'PENDING' || s === 'PENDING_REVIEW') return 'PENDING';
  if (['APPROVED', 'SCHEDULED', 'PUBLISHED', 'FINISHED'].includes(s)) return 'APPROVED';
  if (s === 'REJECTED' || s === 'REJECTED_BY_AI') return 'REJECTED';
  return null;
}

function aggregateStatuses(statuses: ReviewStatus[]): ReviewStatus | null {
  const active = statuses.filter(
    (s) => s === 'PENDING' || s === 'APPROVED' || s === 'REJECTED'
  );
  if (!active.length) return null;
  if (active.some((s) => s === 'REJECTED')) return 'REJECTED';
  if (active.some((s) => s === 'PENDING')) return 'PENDING';
  return 'APPROVED';
}

function statusStyle(status: ReviewStatus | null) {
  if (status === 'PENDING') return styles.pickerOptionPending;
  if (status === 'APPROVED') return styles.pickerOptionApproved;
  if (status === 'REJECTED') return styles.pickerOptionRejected;
  return styles.pickerOptionFree;
}

function statusTextStyle(status: ReviewStatus | null) {
  if (status === 'PENDING') return styles.pickerOptionTextPending;
  if (status === 'APPROVED') return styles.pickerOptionTextApproved;
  if (status === 'REJECTED') return styles.pickerOptionTextRejected;
  return styles.pickerOptionTextFree;
}

const AdminQuizCalendar = forwardRef<AdminQuizCalendarHandle, AdminQuizCalendarProps>(
  function AdminQuizCalendar({ onQuizSelect }, ref) {
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

    const normalizeOccupied = (rawList: any[]): OccupiedDate[] => {
      return (rawList || []).map((od) => {
        const hoursOut: OccupiedDate['hours'] = {};
        const hoursIn = od.hours || {};
        for (const [hKey, hourVal] of Object.entries(hoursIn as Record<string, any>)) {
          // Compat: { minutes: {...} } o mapa directo hora→minuto
          const minutesSource =
            hourVal?.minutes && typeof hourVal.minutes === 'object'
              ? hourVal.minutes
              : hourVal && typeof hourVal === 'object'
                ? hourVal
                : {};

          const minutesOut: Record<string, MinuteSlot> = {};
          for (const [mKey, mVal] of Object.entries(minutesSource as Record<string, any>)) {
            if (mKey === 'hour' || mKey === 'minutes' || mKey === 'status') continue;
            if (!mVal || typeof mVal !== 'object') continue;
            const status = normalizeStatus(mVal.status);
            if (!status) continue;
            minutesOut[mKey] = {
              minute: String(mVal.minute ?? mKey),
              status,
              quizId: Number(mVal.quizId),
              quizTitle: mVal.quizTitle || mVal.title || 'Sin título',
              rawStatus: mVal.rawStatus || mVal.status,
              aiReviewStatus: mVal.aiReviewStatus || null,
              aiReviewReason: mVal.aiReviewReason || null,
              reviewedBy: mVal.reviewedBy || null,
              prizePoolTotal:
                mVal.prizePoolTotal == null ? null : Number(mVal.prizePoolTotal),
              entryCost: 1,
            };
          }
          if (Object.keys(minutesOut).length) {
            hoursOut[hKey] = { hour: String(hourVal?.hour ?? hKey), minutes: minutesOut };
          }
        }
        return { date: od.date, hours: hoursOut };
      }).filter((od) => Object.keys(od.hours).length > 0);
    };

    const fetchYearSummary = useCallback(async () => {
      try {
        const response = await authFetch(`/admin/quizzes/occupied-dates?year=${year}`);
        const data = await response.json();
        if (data.success) {
          setYearStatus(normalizeStatus(data.yearStatus));
          const next: Record<string, ReviewStatus> = {};
          for (const [k, v] of Object.entries(data.monthStatuses || {})) {
            const n = normalizeStatus(v);
            if (n) next[k] = n;
          }
          setMonthStatuses(next);
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
          setOccupiedDates(normalizeOccupied(data.occupiedDates ?? []));
          setMonthStatuses((prev) => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(data.monthStatuses || {})) {
              const n = normalizeStatus(v);
              if (n) next[k] = n;
              else delete next[k];
            }
            return next;
          });
        }
      } catch (error) {
        console.error('Error fetching occupied dates:', error);
      }
    }, [year, month]);

    const refresh = useCallback(() => {
      fetchYearSummary();
      if (month) fetchMonthDetails();
    }, [fetchYearSummary, fetchMonthDetails, month]);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    useEffect(() => {
      fetchYearSummary();
      setMonth('');
      setDay('');
      setHour('');
      setMinute('');
      setOccupiedDates([]);
      setSelectedQuizzes([]);
    }, [year, fetchYearSummary]);

    useEffect(() => {
      if (month) {
        fetchMonthDetails();
        setDay('');
        setHour('');
        setMinute('');
        setSelectedQuizzes([]);
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
      return aggregateStatuses(Object.values(hourData.minutes).map((m) => m.status));
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
      selected = false,
    ) => (
      <Pressable
        key={key}
        style={[
          size === 'sm' ? styles.pickerOptionSm : styles.pickerOption,
          statusStyle(status),
          selected && styles.pickerOptionSelected,
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
              renderPickerOption(
                y,
                String(y),
                y === year ? yearStatus : null,
                () => setYear(y),
                'md',
                y === year,
              ),
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
                month === String(m.value),
              ),
            )}
          </View>
        </AppSection>

        {month ? (
          <AppSection title="Día" accentIndex={2}>
            <View style={styles.pickerContainer}>
              {days.map((d) =>
                renderPickerOption(
                  d,
                  String(d),
                  getDayStatus(d),
                  () => {
                    setDay(String(d));
                    setHour('');
                    setMinute('');
                    setSelectedQuizzes([]);
                  },
                  'md',
                  day === String(d),
                ),
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
                    setSelectedQuizzes([]);
                  },
                  'md',
                  hour === String(h),
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
                  'md',
                  minute === String(m),
                ),
              )}
            </View>
          </AppSection>
        ) : null}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendPending]} />
            <Text style={styles.legendText}>Sin revisar (azul pastel)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendApproved]} />
            <Text style={styles.legendText}>Aprobado (verde)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendRejected]} />
            <Text style={styles.legendText}>Denegado por la app (rojo)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, styles.legendFree]} />
            <Text style={styles.legendText}>Hueco libre</Text>
          </View>
        </View>

        {selectedQuizzes.length > 0 ? (
          <AppSection title="Quiz seleccionado" accentIndex={2}>
            {selectedQuizzes.map((quiz) => (
              <View
                key={quiz.quizId}
                style={[
                  styles.quizCard,
                  quiz.status === 'REJECTED' && styles.quizCardRejected,
                ]}
              >
                <Text style={styles.quizTitle}>{quiz.quizTitle || 'Sin título'}</Text>
                <Text style={styles.quizStatus}>
                  Estado: {quiz.rawStatus ?? quiz.status}
                  {quiz.reviewedBy === 'AI' ? ' · revisado por la app' : ''}
                </Text>
                {quiz.aiReviewReason ? (
                  <Text style={styles.quizAiReason}>
                    Motivo IA: {quiz.aiReviewReason}
                  </Text>
                ) : null}
                <Text style={styles.quizStatus}>Entrada: 1 crédito (fijo)</Text>
                {String(quiz.rawStatus || '').toUpperCase() === 'FINISHED' ? (
                  <Text style={styles.quizStatus}>
                    Prize pool repartido: {quiz.prizePoolTotal ?? 0} créditos
                  </Text>
                ) : null}
                {quiz.status === 'REJECTED' ? (
                  <Text style={styles.quizHint}>
                    Abre el quiz para enviar un mensaje al creador si hace falta.
                  </Text>
                ) : null}
              </View>
            ))}
          </AppSection>
        ) : null}
      </ScrollView>
    );
  },
);

export default AdminQuizCalendar;

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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pickerOptionSm: {
    minWidth: 52,
    height: 40,
    paddingHorizontal: Spacing.two,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pickerOptionPending: {
    // Azul pastel — sin revisar aún
    backgroundColor: '#BFDBFE',
    borderColor: '#93C5FD',
  },
  pickerOptionApproved: {
    backgroundColor: '#4CAF50',
    borderColor: '#22C55E',
  },
  pickerOptionRejected: {
    // Rojo fuerte — denegado por la app
    backgroundColor: '#B91C1C',
    borderColor: '#7F1D1D',
  },
  pickerOptionFree: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  pickerOptionSelected: {
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerOptionTextPending: {
    color: '#1E3A8A',
  },
  pickerOptionTextApproved: {
    color: '#FFFFFF',
  },
  pickerOptionTextRejected: {
    color: '#FFFFFF',
  },
  pickerOptionTextFree: {
    color: '#6B7280',
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
    backgroundColor: '#BFDBFE',
  },
  legendApproved: {
    backgroundColor: '#4CAF50',
  },
  legendRejected: {
    backgroundColor: '#B91C1C',
  },
  legendFree: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  quizCardRejected: {
    borderColor: '#B91C1C',
    backgroundColor: '#FEF2F2',
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
  quizAiReason: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  quizHint: {
    fontSize: 13,
    color: '#7F1D1D',
    marginTop: 8,
  },
});
