import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';
import { formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';

export default function QuizSubmittedScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ quizId?: string; scheduledAt?: string }>();

  const dateLabel = (() => {
    if (!params.scheduledAt) return null;
    const d = new Date(params.scheduledAt);
    if (Number.isNaN(d.getTime())) return null;
    return formatQuizStart(params.scheduledAt, resolveViewerTimezone()).fullLabel;
  })();

  return (
    <AppScreen>
      <AppHeader
        title={t('quizSubmitted.title')}
        subtitle={t('quizSubmitted.subtitle')}
      />
      <AppSection title={t('quizSubmitted.sectionTitle')} accentIndex={1}>
        <InfoBar>
          <Text style={styles.lead}>{t('quizSubmitted.lead')}</Text>
        </InfoBar>
        <AppCard>
          <Text style={styles.body}>{t('quizSubmitted.body')}</Text>
          {dateLabel ? (
            <Text style={styles.date}>
              {t('quizSubmitted.scheduledLabel', { date: dateLabel })}
            </Text>
          ) : null}
          <Text style={styles.promoteTitle}>{t('quizSubmitted.promoteTitle')}</Text>
          <Text style={styles.body}>{t('quizSubmitted.promoteBody')}</Text>
        </AppCard>
        <View style={styles.actions}>
          <GradientButton
            label={t('quizSubmitted.goHome')}
            onPress={() => router.replace('/(app)')}
          />
          {params.quizId ? (
            <GradientButton
              label={t('quizSubmitted.viewQuiz')}
              onPress={() =>
                router.replace({
                  pathname: '/(app)/quiz/[id]',
                  params: { id: String(params.quizId) },
                })
              }
            />
          ) : null}
        </View>
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 22,
  },
  body: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.three,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.four,
  },
  promoteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  actions: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
