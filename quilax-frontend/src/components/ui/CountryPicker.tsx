import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, bodyTypeface } from '@/constants/theme';
import { COUNTRY_CODES, countryNameKey } from '@/constants/countries';
import CustomIcon from '@/components/CustomIcon';

type Props = {
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
};

/** Nationality picker: search + clean list rows (no chip clutter). */
export default function CountryPicker({ value, onChange, required = true }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');

  const options = useMemo(() => {
    const lang = i18n.language || 'es';
    const q = query.trim().toLowerCase();
    return COUNTRY_CODES.map((code) => {
      const label = t(countryNameKey(code), { defaultValue: code });
      return { code, label };
    })
      .filter((item) => !q || item.label.toLowerCase().includes(q) || item.code.toLowerCase().includes(q))
      .sort((a, b) => a.label.localeCompare(b.label, lang, { sensitivity: 'base' }));
  }, [t, i18n.language, query]);

  const selectedLabel = value
    ? t(countryNameKey(value), { defaultValue: value })
    : null;

  return (
    <View style={styles.wrap}>
      {selectedLabel ? (
        <View style={styles.selectedRow}>
          <Text style={styles.selectedLabel}>{selectedLabel}</Text>
          <Pressable
            onPress={() => onChange('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('common.clear', { defaultValue: 'Clear' })}
          >
            <Text style={styles.clear}>{t('common.change', { defaultValue: 'Cambiar' })}</Text>
          </Pressable>
        </View>
      ) : null}
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={t('auth.registerScreen.nationalitySearch')}
        placeholderTextColor={Colors.light.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {required && !value ? (
        <Text style={styles.hint}>{t('auth.registerScreen.nationalityRequired')}</Text>
      ) : null}
      <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {options.map((item) => {
          const active = value === item.code;
          return (
            <Pressable
              key={item.code}
              onPress={() => onChange(item.code)}
              style={[styles.row, active && styles.rowActive]}
            >
              <Text style={[styles.rowText, active && styles.rowTextActive]}>{item.label}</Text>
              {active ? <CustomIcon name="check" size={18} color={Colors.light.primary} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.two },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  selectedLabel: {
    ...bodyTypeface,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  clear: {
    ...bodyTypeface,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
    marginLeft: Spacing.two,
  },
  search: {
    ...bodyTypeface,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 14,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  hint: {
    ...bodyTypeface,
    fontSize: 13,
    color: Colors.light.error,
    marginBottom: Spacing.two,
    fontWeight: '600',
  },
  list: {
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  rowActive: {
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  rowText: {
    ...bodyTypeface,
    fontSize: 15,
    color: Colors.light.text,
    fontWeight: '500',
    flex: 1,
  },
  rowTextActive: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
});
