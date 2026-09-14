import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { APP_LANGUAGES, setAppLanguage, type AppLanguage } from '@/i18n';
import { Colors, Fonts, Spacing } from '@/constants/theme';

type Props = {
  compact?: boolean;
};

export function LanguageSwitcher({ compact }: Props) {
  const { i18n, t } = useTranslation();
  const current = i18n.language.slice(0, 2) as AppLanguage;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {!compact ? (
        <Text style={styles.label}>{t('common.language')}</Text>
      ) : null}
      <View style={styles.chips}>
        {APP_LANGUAGES.map((lng) => {
          const active = current === lng;
          return (
            <Pressable
              key={lng}
              onPress={() => void setAppLanguage(lng)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={t(`language.${lng}`)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`language.${lng}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  rowCompact: {
    marginTop: 0,
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
