import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { Colors, Spacing } from '@/constants/theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import CustomIcon from '@/components/CustomIcon';
import apiClient from '@/lib/api';
import quizService from '@/services/quizService';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';
import { formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';

export default function ConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const quizId = params.quizId as string;
  const difficulty = params.difficulty as string;
  const scheduledAt = (params.scheduledAt || params.date) as string;
  const questionsCount = params.questionsCount as string;
  const [canMessageAdmin, setCanMessageAdmin] = useState(false);
  const [adminMessageReason, setAdminMessageReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formattedDate = useMemo(() => {
    if (!scheduledAt) return t('confirmQuiz.notScheduled');
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return String(scheduledAt);
    return formatQuizStart(scheduledAt, resolveViewerTimezone()).fullLabel;
  }, [scheduledAt, t]);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiClient.get('/quiz-creation/can-message-admin');
        setCanMessageAdmin(Boolean(data?.canMessage));
        setAdminMessageReason(data?.reason || '');
      } catch (error) {
        console.error('Error checking admin messaging permission:', error);
      }
    })();
  }, []);

  const handleConfirm = async () => {
    if (!quizId) {
      Alert.alert(t('common.error'), t('confirmQuiz.missingQuizError'));
      return;
    }
    if (!scheduledAt) {
      Alert.alert(t('common.error'), t('confirmQuiz.missingDateError'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      if (difficulty) {
        const difficultyResult = await quizService.updateQuiz(Number(quizId), {
          difficulty: Number(difficulty),
        });
        if (!difficultyResult.success) {
          throw new Error(difficultyResult.error || t('confirmQuiz.difficultyUpdateError'));
        }
      }

      const publishResult = await quizService.publishQuiz(Number(quizId), scheduledAt);
      if (!publishResult.success) {
        throw new Error(publishResult.error || t('confirmQuiz.publishError'));
      }

      Alert.alert(t('confirmQuiz.submittedTitle'), t('confirmQuiz.submittedBody'));
      router.push('/(app)');
    } catch (error: any) {
      const message = error.message || t('confirmQuiz.submitGenericError');
      setSubmitError(message);
      Alert.alert(t('common.error'), message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader title={t('confirmQuiz.title')} showBack subtitle={t('confirmQuiz.subtitle')} />
      <AppSection title={t('confirmQuiz.summarySection')} accentIndex={0}>
        <InfoBar>
          <Text style={styles.readyTitle}>{t('confirmQuiz.readyTitle')}</Text>
          <Text style={styles.readyText}>
            {t('confirmQuiz.readyText')}
          </Text>
        </InfoBar>
        <AppCard>
          <View style={styles.infoItem}>
            <CustomIcon name="rules" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>
              {t('confirmQuiz.difficultyInfo', { value: difficulty || t('confirmQuiz.difficultyNotSelected') })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <CustomIcon name="time" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>{t('confirmQuiz.dateInfo', { date: formattedDate })}</Text>
          </View>
          <View style={[styles.infoItem, styles.infoItemLast]}>
            <CustomIcon name="edit" size={20} color={Colors.light.text} />
            <Text style={styles.infoText}>{t('confirmQuiz.questionsInfo', { n: questionsCount || '0' })}</Text>
          </View>
        </AppCard>
        {submitError ? <Text style={styles.error}>{submitError}</Text> : null}
        {submitting ? (
          <ActivityIndicator color={Colors.light.primary} />
        ) : (
          <GradientButton label={t('confirmQuiz.submitButton')} onPress={handleConfirm} />
        )}
        <Text style={styles.disclaimer}>
          {t('confirmQuiz.disclaimer')}
        </Text>
        {canMessageAdmin ? (
          <GradientButton
            label={
              adminMessageReason
                ? t('confirmQuiz.writeToPanelWithReason', { reason: adminMessageReason })
                : t('confirmQuiz.writeToPanel')
            }
            onPress={() => router.push('/(app)/messages/admin')}
          />
        ) : null}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  readyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  readyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  infoItemLast: { marginBottom: 0 },
  infoText: { fontSize: 15, color: Colors.light.text, flex: 1 },
  error: {
    color: Colors.light.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  disclaimer: {
    color: Colors.light.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: Spacing.two,
  },
});
