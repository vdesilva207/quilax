import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';
import { getQuizLanguageMeta, normalizeQuizLanguage } from '@/constants/quizLanguages';
import { QuizContentFlags } from '@/components/FlagIcons';

type Props = {
  language?: string | null;
  /** Smaller chip for dense cards */
  compact?: boolean;
};

/** Bandera(s) dibujadas + código. Sin emoji. Indica idioma del contenido (no traducido). */
export function QuizLanguageBadge({ language, compact }: Props) {
  const { t } = useTranslation();
  const meta = getQuizLanguageMeta(language);
  const code = normalizeQuizLanguage(language);
  const a11y = t('quizLanguage.badgeA11y', {
    code: meta.letters,
    language: t(meta.labelKey),
  });
  return (
    <View
      style={[styles.badge, compact && styles.badgeCompact]}
      accessibilityLabel={a11y}
      accessibilityHint={t('quizLanguage.notTranslated')}
    >
      <QuizContentFlags code={code} compact={compact} />
      <Text style={[styles.letters, compact && styles.lettersCompact]}>{meta.letters}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(28, 25, 23, 0.06)',
  },
  badgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  letters: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.light.textSecondary,
  },
  lettersCompact: {
    fontSize: 10,
  },
});

export default QuizLanguageBadge;
