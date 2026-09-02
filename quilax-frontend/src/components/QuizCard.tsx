import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { getCategoryStyle, getCategoryLabel } from '@/constants/quizCategories';
import { getQuizLanguageMeta } from '@/constants/quizLanguages';
import { QuizLanguageBadge } from '@/components/QuizLanguageBadge';
import { PressScale, StaggerItem } from '@/components/motion';

type QuizCardProps = {
  title: string;
  category?: string | null;
  language?: string | null;
  meta?: string;
  onPress?: () => void;
  /** Denser row for nested home panels */
  dense?: boolean;
  style?: object;
  /** Optional stagger index when rendered in a list */
  staggerIndex?: number;
};

/** Quiz card tinted with its category pastel. */
export function QuizCard({
  title,
  category,
  language,
  meta,
  onPress,
  dense,
  style,
  staggerIndex,
}: QuizCardProps) {
  const { t } = useTranslation();
  const c = getCategoryStyle(category);
  const categoryLabel = getCategoryLabel(category, t);
  const langMeta = language != null && language !== '' ? getQuizLanguageMeta(language) : null;

  const card = (
    <View
      style={[
        styles.card,
        dense && styles.cardDense,
        {
          backgroundColor: c.bg,
          borderColor: c.border,
        },
        style,
      ]}
      accessibilityLabel={[
        title,
        categoryLabel,
        langMeta
          ? t('quizLanguage.badgeA11y', {
              code: langMeta.letters,
              language: t(langMeta.labelKey),
            })
          : null,
        meta,
      ]
        .filter(Boolean)
        .join('. ')}
    >
      <View style={styles.topRow}>
        <View style={styles.leftMeta}>
          {categoryLabel ? (
            <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
              {categoryLabel}
            </Text>
          ) : null}
          <QuizLanguageBadge language={language} compact={dense} />
        </View>
        {meta ? (
          <Text style={styles.metaInline} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.title, dense && styles.titleDense]} numberOfLines={dense ? 2 : 3}>
        {title}
      </Text>
    </View>
  );

  const interactive = onPress ? (
    <PressScale onPress={onPress} scaleTo={0.98}>
      {card}
    </PressScale>
  ) : (
    card
  );

  if (typeof staggerIndex === 'number') {
    return <StaggerItem index={staggerIndex}>{interactive}</StaggerItem>;
  }

  return interactive;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    marginBottom: 10,
    width: '100%',
  },
  cardDense: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: 6,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    flex: 1,
  },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2, flexShrink: 1 },
  metaInline: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    flexShrink: 0,
    maxWidth: '42%',
  },
  title: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 22,
  },
  titleDense: {
    fontSize: 15,
    lineHeight: 20,
  },
});
