import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, RefreshControl, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import { QuizCard } from '@/components/QuizCard';
import apiClient from '@/lib/api';
import { formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';

export default function MatchesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [recoverable, setRecoverable] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recoveringId, setRecoveringId] = useState<number | 'all' | null>(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [home, enrollmentsRes, recoverableRes] = await Promise.all([
        apiClient.get('/home').catch(() => null),
        apiClient.get('/profile/me/upcoming-enrollments').catch(() => null),
        apiClient.get('/profile/me/recoverable-enrollments').catch(() => null),
      ]);
      if (!home && !enrollmentsRes) {
        setLoadError(t('matches.loadError'));
        setUpcoming([]);
        setRecent([]);
        setRecoverable([]);
        return;
      }
      const data = home?.data || home || {};
      const fromHome = data.myUpcomingEnrollments || [];
      const fromProfile = enrollmentsRes?.enrollments || enrollmentsRes?.data?.enrollments || [];
      const map = new Map<number, any>();
      [...fromHome, ...fromProfile].forEach((item: any) => {
        const quizId = item.quizId || item.quiz?.id || item.id;
        if (!quizId) return;
        map.set(quizId, {
          id: quizId,
          title: item.title || item.quiz?.title,
          category: item.category || item.quiz?.category,
          language: item.language || item.quiz?.language,
          nextScheduledAt: item.startsAt || item.nextScheduledAt || item.quiz?.nextScheduledAt,
        });
      });
      const list = [...map.values()].sort((a, b) => {
        const ta = new Date(a.nextScheduledAt || 0).getTime();
        const tb = new Date(b.nextScheduledAt || 0).getTime();
        return ta - tb;
      });
      setUpcoming(list);
      setRecent(data.recentActivity || []);
      setRecoverable(
        recoverableRes?.enrollments || recoverableRes?.data?.enrollments || []
      );
    } catch {
      setLoadError(t('matches.loadError'));
      setUpcoming([]);
      setRecent([]);
      setRecoverable([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  const recoverOne = async (quizId: number) => {
    setRecoveringId(quizId);
    try {
      await apiClient.post(`/profile/me/recoverable-enrollments/${quizId}/recover`);
      setRecoverable((prev) => prev.filter((x) => x.quizId !== quizId));
      Alert.alert(t('matches.recoverSuccess'));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('matches.recoverError'));
    } finally {
      setRecoveringId(null);
    }
  };

  const recoverAll = async () => {
    setRecoveringId('all');
    try {
      const res = await apiClient.post('/profile/me/recoverable-enrollments/recover-all');
      const n = res?.refunded ?? recoverable.length;
      setRecoverable([]);
      Alert.alert(t('matches.recoverAllSuccess', { n }));
    } catch (e: any) {
      Alert.alert(t('common.error'), e?.message || t('matches.recoverError'));
    } finally {
      setRecoveringId(null);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={Colors.light.primary}
        />
      }
    >
      <AppHeader title={t('matches.title')} subtitle={t('matches.subtitle')} />

      {loadError ? (
        <AppSection title={t('common.error')} accentIndex={3}>
          <AppPlaceholder
            text={loadError}
            actionLabel={t('common.retry')}
            onAction={() => {
              setRefreshing(true);
              setLoading(true);
              load();
            }}
          />
        </AppSection>
      ) : null}

      {recoverable.length > 0 ? (
        <AppSection title={t('matches.recoverSection')} accentIndex={3}>
          <Text style={styles.recoverSub}>{t('matches.recoverSubtitle')}</Text>
          {recoverable.length > 1 ? (
            <Pressable
              style={({ pressed }) => [styles.recoverAllBtn, pressed && { opacity: 0.9 }]}
              disabled={recoveringId != null}
              onPress={recoverAll}
            >
              {recoveringId === 'all' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.recoverAllText}>{t('matches.recoverAll')}</Text>
              )}
            </Pressable>
          ) : null}
          <View style={styles.body}>
            {recoverable.map((item) => {
              const reason =
                item.reason === 'CANCELLED'
                  ? t('matches.recoverReasonCancelled')
                  : t('matches.recoverReasonNeverRan');
              const when = item.scheduledAt
                ? formatQuizStart(item.scheduledAt, resolveViewerTimezone()).compactLabel
                : reason;
              return (
                <AppCard key={item.enrollmentId || item.quizId}>
                  <Text style={styles.recoverTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.recoverMeta}>
                    {reason}
                    {when && item.scheduledAt ? ` · ${when}` : ''}
                  </Text>
                  <Pressable
                    style={({ pressed }) => [styles.recoverBtn, pressed && { opacity: 0.9 }]}
                    disabled={recoveringId != null}
                    onPress={() => recoverOne(item.quizId)}
                  >
                    {recoveringId === item.quizId ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.recoverBtnText}>{t('matches.recoverOne')}</Text>
                    )}
                  </Pressable>
                </AppCard>
              );
            })}
          </View>
        </AppSection>
      ) : null}

      <AppSection title={t('matches.upcomingSection')} accentIndex={0}>
        {upcoming.length === 0 ? (
          <AppPlaceholder text={t('matches.empty')} />
        ) : (
          <View style={styles.body}>
            {upcoming.map((quiz, index) => {
              const start = quiz.nextScheduledAt;
              const meta = start
                ? formatQuizStart(start, resolveViewerTimezone()).compactLabel
                : t('matches.recentActivity');
              return (
                <QuizCard
                  key={quiz.id}
                  staggerIndex={index}
                  title={quiz.title}
                  category={quiz.category}
                  language={quiz.language}
                  meta={meta}
                  onPress={() => router.push(`/(app)/quiz/${quiz.id}`)}
                />
              );
            })}
          </View>
        )}
      </AppSection>

      <AppSection title={t('matches.recentSection')} accentIndex={1}>
        {recent.length === 0 ? (
          <AppCard>
            <Text style={styles.empty}>{t('matches.emptyRecent')}</Text>
          </AppCard>
        ) : (
          <View style={styles.body}>
            {recent.map((item: any, index: number) => {
              const quiz = item.quiz || item.quizRun?.quiz;
              return (
                <QuizCard
                  key={item.id || `${item.quizRunId}-${item.userId}`}
                  staggerIndex={index}
                  title={quiz?.title || t('matches.recentActivity')}
                  category={quiz?.category}
                  language={quiz?.language}
                  meta={t('matches.recentActivity')}
                  onPress={() => {
                    if (quiz?.id) router.push(`/(app)/quiz/${quiz.id}`);
                  }}
                />
              );
            })}
          </View>
        )}
      </AppSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { gap: Spacing.two },
  empty: { color: Colors.light.textSecondary, fontSize: 14 },
  recoverSub: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.two,
  },
  recoverTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recoverMeta: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  recoverBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  recoverBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  recoverAllBtn: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  recoverAllText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
