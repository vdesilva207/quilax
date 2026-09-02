import React, { useRef, useState } from 'react';
import { View, TextInput, Text, StyleSheet, type TextInput as TextInputType } from 'react-native';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';

type Props = {
  value: string; // YYYY-MM-DD or ''
  onChange: (iso: string) => void;
  dayPlaceholder?: string;
  monthPlaceholder?: string;
  yearPlaceholder?: string;
};

function clampDigits(raw: string, maxLen: number) {
  return raw.replace(/\D/g, '').slice(0, maxLen);
}

function toIso(day: string, month: string, year: string) {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return '';
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return '';
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return '';
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function fromIso(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return { day: '', month: '', year: '' };
  const [y, m, d] = iso.split('-');
  return { day: d, month: m, year: y };
}

/** Rigid DOB: DD / MM / YYYY with auto-advance. Emits ISO YYYY-MM-DD when complete+valid. */
export default function BirthDateFields({
  value,
  onChange,
  dayPlaceholder = 'DD',
  monthPlaceholder = 'MM',
  yearPlaceholder = 'AAAA',
}: Props) {
  const initial = fromIso(value);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  const monthRef = useRef<TextInputType>(null);
  const yearRef = useRef<TextInputType>(null);

  const emit = (d: string, m: string, y: string) => {
    onChange(toIso(d, m, y));
  };

  return (
    <View style={styles.row}>
      <TextInput
        style={styles.box}
        value={day}
        onChangeText={(raw) => {
          const next = clampDigits(raw, 2);
          setDay(next);
          emit(next, month, year);
          if (next.length === 2) monthRef.current?.focus();
        }}
        placeholder={dayPlaceholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="number-pad"
        maxLength={2}
        returnKeyType="next"
        accessibilityLabel={dayPlaceholder}
      />
      <Text style={styles.sep}>/</Text>
      <TextInput
        ref={monthRef}
        style={styles.box}
        value={month}
        onChangeText={(raw) => {
          const next = clampDigits(raw, 2);
          setMonth(next);
          emit(day, next, year);
          if (next.length === 2) yearRef.current?.focus();
          if (next.length === 0) {
            /* stay */
          }
        }}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && month.length === 0) {
            /* RN may not always fire; handled by empty */
          }
        }}
        placeholder={monthPlaceholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="number-pad"
        maxLength={2}
        returnKeyType="next"
        accessibilityLabel={monthPlaceholder}
      />
      <Text style={styles.sep}>/</Text>
      <TextInput
        ref={yearRef}
        style={[styles.box, styles.year]}
        value={year}
        onChangeText={(raw) => {
          const next = clampDigits(raw, 4);
          setYear(next);
          emit(day, month, next);
        }}
        placeholder={yearPlaceholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType="number-pad"
        maxLength={4}
        returnKeyType="done"
        accessibilityLabel={yearPlaceholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
    gap: 6,
  },
  box: {
    ...bodyTypeface,
    flex: 1,
    maxWidth: 72,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 14,
    paddingHorizontal: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: Colors.light.text,
  },
  year: {
    maxWidth: 96,
    flex: 1.4,
  },
  sep: {
    ...bodyTypeface,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
});
