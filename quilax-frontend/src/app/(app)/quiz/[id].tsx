import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Pressable,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, titleTypeface, bodyTypeface, MaxContentWidth } from '@/constants/theme';
import { AppScreen, AppHeader, AppCard, AppSection } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';
import { getCategoryStyle, getCategoryLabel } from '@/constants/quizCategories';
import { QuizLanguageBadge } from '@/components/QuizLanguageBadge';
import QuizEnrollModal from '@/components/quiz/QuizEnrollModal';
import QuizShareSheet from '@/components/quiz/QuizShareSheet';
import quizRunService from '@/services/quizRunService';
import apiClient from '@/lib/api';
import {
  formatQuizStart,
  getCountdown,
  getDateLocale,
  resolveViewerTimezone,
} from '@/utils/timezone';
import {
  getEarlyJoinBonusDescription,
  buildEarlyJoinPreview,
  EARLY_JOIN_BONUS_RANGES,
} from '@/utils/earlyJoinBonus';
import { APP_GRADIENT_SOFT, GRADIENT_HORIZONTAL } from '@/constants/gradients';

/** Prize pool / payout breakdown is hidden until this many players have joined. */
const PRIZE_POOL_REVEAL_AT = 20;

function formatCredits(n: number, lang?: string) {
  return new Intl.NumberFormat(getDateLocale(lang)).format(
    Math.max(0, Math.floor(Number(n) || 0))
  );
}

export default function QuizDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [sheetVisible, setSheetVisible] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [runId, setRunId] = useState<number | null>(null);
  const [earlyJoinOpen, setEarlyJoinOpen] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);

  const loadQuiz = useCallback(async (opts?: { silent?: boolean }) => {
    if (!id) return;
    if (!opts?.silent) setLoading(true);
    try {
      const result = await quizRunService.getQuizInfo(id);
      if (result.success) {
        setQuiz(result.data);
        setError(null);
        try {
          const tz = resolveViewerTimezone(result.data?.viewerTimezone);
          await apiClient.put('/profile/timezone', { timezone: tz }).catch(() => null);
        } catch {
          /* ignore */
        }
      } else if (!opts?.silent) {
        setError(result.error || t('quizDetail.loadError'));
      }
    } catch (err: any) {
      if (!opts?.silent) {
        setError(err?.message || t('quizDetail.loadError'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const initialLoadDone = React.useRef(false);
  useFocusEffect(
    useCallback(() => {
      const silent = initialLoadDone.current;
      loadQuiz({ silent }).finally(() => {
        initialLoadDone.current = true;
      });
    }, [loadQuiz])
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep enrollment counter fresh while the prize pool is still locked.
  const needsPrizeUnlockPoll =
    Boolean(quiz) && (Number(quiz?.enrollmentCount) || 0) < PRIZE_POOL_REVEAL_AT;
  useEffect(() => {
    if (!id || !needsPrizeUnlockPoll) return;
    const timer = setInterval(() => {
      void loadQuiz({ silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [id, needsPrizeUnlockPoll, loadQuiz]);

  const timeZone = useMemo(
    () => resolveViewerTimezone(quiz?.viewerTimezone),
    [quiz?.viewerTimezone]
  );

  const startsAt = quiz?.startsAt || quiz?.nextScheduledAt || null;

  const startFmt = useMemo(() => {
    if (!startsAt) return null;
    return formatQuizStart(startsAt, timeZone);
  }, [startsAt, timeZone]);

  const countdown = useMemo(() => {
    if (!startsAt) return null;
    return getCountdown(startsAt, now);
  }, [startsAt, now]);

  const openJoinSheet = async () => {
    setJoinError(null);
    setRunId(null);
    setJoinedSuccess(false);
    setSheetVisible(true);
    setPreparing(true);

    try {
      const joinResult = await quizRunService.canJoin(id);

      if (!joinResult.success) {
        setJoinError(joinResult.error || t('quizDetail.prepareJoinError'));
        return;
      }

      if (joinResult.data?.canJoin === false) {
        setJoinError(joinResult.data.reason || t('quizDetail.cannotJoinNow'));
        return;
      }
    } catch {
      setJoinError(t('quizDetail.prepareJoinError'));
    } finally {
      setPreparing(false);
    }
  };

  const confirmJoin = async () => {
    if (joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const enroll = await quizRunService.enrollQuiz(id);
      if (!enroll.success) {
        setJoinError(enroll.error || t('quizDetail.joinError'));
        Alert.alert(t('common.error'), enroll.error || t('quizDetail.joinError'));
        return;
      }

      const lobbyOpen = !!enroll.data?.lobbyOpen;
      const nextRunId = enroll.data?.runId ? Number(enroll.data.runId) : null;

      if (lobbyOpen && nextRunId) {
        const joinResult = await quizRunService.joinQuiz(nextRunId);
        if (!joinResult.success) {
          setJoinError(joinResult.error || t('quizDetail.joinError'));
          Alert.alert(t('common.error'), joinResult.error || t('quizDetail.joinError'));
          return;
        }
        setSheetVisible(false);
        router.replace(`/(app)/quiz/run/${nextRunId}`);
        return;
      }

      setSheetVisible(false);
      setJoinedSuccess(true);
    } catch (err: any) {
      setJoinError(err?.message || t('quizDetail.joinError'));
      Alert.alert(t('common.error'), err?.message || t('quizDetail.joinError'));
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (error || !quiz) {
    return (
      <AppScreen>
        <AppHeader title={t('quizDetail.headerFallback')} showBack />
        <AppSection title={t('common.error')} accentIndex={3}>
          <Text style={styles.errorBody}>{error || t('quizDetail.notFound')}</Text>
          <Text style={styles.errorHint}>{t('quizDetail.loadErrorHint')}</Text>
          <GradientButton label={t('common.retry')} onPress={() => loadQuiz()} />
        </AppSection>
      </AppScreen>
    );
  }

  const pastel = getCategoryStyle(quiz.category);
  const prizes = Array.isArray(quiz.prizePreview?.positions)
    ? quiz.prizePreview.positions
    : [];
  const totalPool = Math.max(
    0,
    Number(quiz.currentPrizePool ?? quiz.prizePreview?.prizePool ?? 0) || 0
  );
  const enrollmentCount = Math.max(0, Number(quiz.enrollmentCount) || 0);
  const prizePoolUnlocked = enrollmentCount >= PRIZE_POOL_REVEAL_AT;
  const earlyJoinRaw =
    quiz.earlyJoin?.stillAvailable != null
      ? quiz.earlyJoin
      : buildEarlyJoinPreview((Number(quiz.enrollmentCount) || 0) + 1);
  const showEarlyJoin = earlyJoinRaw?.stillAvailable === true;
  const earlyJoinTiers =
    (Array.isArray(earlyJoinRaw?.tiers) && earlyJoinRaw.tiers.length
      ? earlyJoinRaw.tiers
      : EARLY_JOIN_BONUS_RANGES) as Array<{ from: number; to: number; bonus: number }>;
  const earlyJoinNowLabel =
    showEarlyJoin && earlyJoinRaw?.bonus > 0
      ? getEarlyJoinBonusDescription(earlyJoinRaw.nextJoinPosition)
      : null;
  const creditsFmt = (n: number) =>
    t('quizDetail.creditsAmount', { n: formatCredits(n, i18n.language) });

  return (
    <AppScreen>
      <AppHeader
        title={quiz.title}
        subtitle={quiz.category ? getCategoryLabel(quiz.category, t) : t('quizDetail.liveQuizSubtitle')}
        badge={t('quizDetail.questionsBadge', { n: quiz._count?.questions || quiz.questions?.length || '?' })}
        showBack
      />

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.six }}>
        {quiz.coverImage ? (
          <Image source={{ uri: quiz.coverImage }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: pastel.bg }]}>
            <Text style={[styles.coverPlaceholderText, { color: pastel.text }]}>
              {t('quizDetail.noCoverPhoto')}
            </Text>
          </View>
        )}

        <AppSection title={t('quizDetail.startSection')} accentIndex={0}>
          <View style={styles.metaRow}>
            {quiz.category ? (
              <View style={[styles.catBadge, { backgroundColor: pastel.bg, borderColor: pastel.border }]}>
                <Text style={[styles.catBadgeText, { color: pastel.text }]}>{getCategoryLabel(quiz.category, t)}</Text>
              </View>
            ) : null}
            <QuizLanguageBadge language={quiz.language} />
          </View>
          <Text style={styles.langNote}>{t('quizLanguage.detailNote')}</Text>

          {startFmt ? (
            <View style={styles.startBox}>
              <View style={styles.startTextCol}>
                <Text style={styles.startLine} numberOfLines={2}>
                  {startFmt.compactLabel || `${startFmt.dateLabel} · ${startFmt.timeLabel}`}
                </Text>
                {startFmt.timeZoneAbbr ? (
                  <Text style={styles.tzHint}>
                    {t('quizDetail.localTimeNote', { tz: startFmt.timeZoneAbbr })}
                  </Text>
                ) : null}
              </View>
              {countdown ? (
                <Text style={styles.countdownInline} numberOfLines={1}>
                  {countdown.label}
                </Text>
              ) : null}
            </View>
          ) : (
            <InfoBar>
              <Text style={styles.info}>{t('quizDetail.startDateTbd')}</Text>
            </InfoBar>
          )}

          <Text style={styles.entryLine}>{t('quizDetail.entryInfo')}</Text>

          {showEarlyJoin ? (
            <View style={styles.earlyJoinCard}>
              <Text style={styles.earlyJoinKicker}>{t('quizDetail.earlyJoinKicker')}</Text>
              <Text style={styles.earlyJoinTitle}>
                {t('quizDetail.earlyJoinTitle', { max: earlyJoinRaw.maxBonus })}
              </Text>
              {earlyJoinNowLabel ? (
                <Text style={styles.earlyJoinNow}>{earlyJoinNowLabel}</Text>
              ) : (
                <Text style={styles.earlyJoinNow}>
                  {t('quizDetail.earlyJoinSpots', {
                    maxPos: earlyJoinRaw.maxPosition,
                    position: earlyJoinRaw.nextJoinPosition,
                  })}
                </Text>
              )}

              <Pressable
                onPress={() => setEarlyJoinOpen((v) => !v)}
                style={({ pressed }) => [styles.earlyJoinToggle, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.earlyJoinToggleText}>
                  {earlyJoinOpen
                    ? t('quizDetail.earlyJoinHideTable')
                    : t('quizDetail.earlyJoinShowTable')}
                </Text>
                <Text style={styles.earlyJoinChevron}>{earlyJoinOpen ? '▴' : '▾'}</Text>
              </Pressable>

              {earlyJoinOpen ? (
                <View style={styles.earlyJoinTable}>
                  {earlyJoinTiers.map((tier) => (
                    <View key={`${tier.from}-${tier.to}`} style={styles.earlyJoinRow}>
                      <Text style={styles.earlyJoinTierPos}>
                        {tier.from === tier.to
                          ? t('quizDetail.earlyJoinPosExact', { n: tier.from })
                          : t('quizDetail.earlyJoinPosRange', {
                              from: tier.from,
                              to: tier.to,
                            })}
                      </Text>
                      <Text style={styles.earlyJoinTierBonus}>+{tier.bonus}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {quiz.canJoin ? (
            <GradientButton label={t('quizDetail.joinButton')} onPress={openJoinSheet} />
          ) : (
            <InfoBar>
              <Text style={styles.info}>
                {['PENDING_REVIEW', 'DRAFT', 'REJECTED'].includes(quiz.status)
                  ? t('quizDetail.notAvailableYet')
                  : t('quizDetail.cannotJoinRightNow')}
              </Text>
            </InfoBar>
          )}
        </AppSection>

        <AppSection title={t('quizDetail.prizesSection')} accentIndex={1}>
          {prizes.length === 0 ? (
            <Text style={styles.meta}>{t('quizDetail.noPrizeRules')}</Text>
          ) : !prizePoolUnlocked ? (
            <View style={styles.prizeLockedCard}>
              <Text style={styles.prizeLockedMessage}>
                {t('quizDetail.prizesLockedUntil', { n: PRIZE_POOL_REVEAL_AT })}
              </Text>
              <Text style={styles.prizeLockedCounter}>
                {t('quizDetail.prizesEnrollmentProgress', {
                  current: enrollmentCount,
                  required: PRIZE_POOL_REVEAL_AT,
                })}
              </Text>
              <Text style={styles.prizeLockedCaption}>
                {t('quizDetail.prizesEnrollmentCaption')}
              </Text>
            </View>
          ) : totalPool <= 0 ? (
            <Text style={styles.meta}>{t('quizDetail.prizesNeedEntries')}</Text>
          ) : (
            <View style={styles.prizePanel}>
              <LinearGradient
                colors={[...APP_GRADIENT_SOFT]}
                {...GRADIENT_HORIZONTAL}
                style={styles.prizeWash}
              />
              <View style={styles.prizeList}>
                {prizes.map((p: any, idx: number) => {
                  const from = Number(p.fromPosition);
                  const to = Number(p.toPosition);
                  let prizeLabel = p.label;
                  if (Number.isFinite(from) && Number.isFinite(to)) {
                    if (from === to) {
                      if (from === 1) prizeLabel = t('quizDetail.prize1st');
                      else if (from === 2) prizeLabel = t('quizDetail.prize2nd');
                      else if (from === 3) prizeLabel = t('quizDetail.prize3rd');
                      else prizeLabel = t('quizDetail.prizeNth', { n: from });
                    } else {
                      prizeLabel = t('quizDetail.prizeRange', { from, to });
                    }
                  }
                  const credits = Number(p.credits) || 0;
                  return (
                    <View
                      key={`${p.fromPosition}-${p.toPosition}`}
                      style={[
                        styles.prizeRow,
                        idx === prizes.length - 1 && styles.prizeRowLast,
                      ]}
                    >
                      <Text style={styles.prizeLabel}>{prizeLabel}</Text>
                      <Text style={styles.prizeAmount}>{creditsFmt(credits)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.inviteBlock}>
            <Text style={styles.inviteHint}>{t('quizDetail.inviteHint')}</Text>
            <Pressable
              onPress={() => setShareVisible(true)}
              style={({ pressed }) => [styles.inviteLink, pressed && { opacity: 0.75 }]}
              hitSlop={6}
            >
              <Text style={styles.inviteLinkText}>{t('quizDetail.shareCta')}</Text>
            </Pressable>
          </View>
        </AppSection>

        <AppSection title={t('quizDetail.creatorSection')} accentIndex={2}>
          <AppCard>
            {quiz.description ? (
              <>
                <Text style={styles.blockTitle}>{t('quizDetail.aboutQuiz')}</Text>
                <Text style={styles.description}>{quiz.description}</Text>
              </>
            ) : (
              <Text style={styles.emptyCreator}>{t('quizDetail.noDescriptionYet')}</Text>
            )}
            {quiz.tips ? (
              <>
                <Text style={[styles.blockTitle, { marginTop: Spacing.three }]}>
                  {t('quizDetail.creatorNotes')}
                </Text>
                <Text style={styles.tips}>{quiz.tips}</Text>
              </>
            ) : null}
            {quiz.difficulty ? (
              <Text style={[styles.meta, { marginTop: Spacing.two }]}>
                {t('quizDetail.difficultyLabel', { n: quiz.difficulty })}
              </Text>
            ) : null}
            {quiz.creator?.username || quiz.creator?.fullName ? (
              <Text style={styles.creatorBy}>
                {t('quizDetail.byCreator', { name: quiz.creator.username || quiz.creator.fullName })}
              </Text>
            ) : null}
          </AppCard>
        </AppSection>

        <AppSection title={t('quizDetail.tipsSection')} accentIndex={3}>
          <View style={styles.tipList}>
            <Text style={styles.tipItem}>· {t('quizDetail.warnStayScreen')}</Text>
            <Text style={styles.tipItem}>· {t('quizDetail.warnConnection')}</Text>
            <Text style={styles.tipItem}>· {t('quizDetail.warnDisconnectPrize')}</Text>
            <Text style={styles.tipItem}>· {t('quizDetail.warnDontLeave')}</Text>
          </View>
        </AppSection>
      </ScrollView>

      <QuizEnrollModal
        visible={sheetVisible}
        quizTitle={quiz.title}
        entryCost={1}
        preparing={preparing}
        loading={joining}
        error={joinError}
        canConfirm={!preparing && !joinError}
        earlyJoinLabel={showEarlyJoin ? earlyJoinNowLabel : null}
        earlyJoinMax={showEarlyJoin ? earlyJoinRaw?.maxBonus : undefined}
        onCancel={() => {
          if (joining) return;
          setSheetVisible(false);
        }}
        onConfirm={confirmJoin}
      />

      {joinedSuccess ? (
        <View style={styles.joinedOverlay} pointerEvents="box-none">
          <View style={styles.joinedCard}>
            <Text style={styles.joinedTitle}>{t('quizDetail.joinedSuccessTitle')}</Text>
            <Text style={styles.joinedBody}>{t('quizDetail.joinedSuccessNotify')}</Text>
            <Text style={styles.joinedMarks}>{t('quizDetail.joinedSuccessMarks')}</Text>
            <GradientButton
              label={t('quizDetail.joinedSuccessCta')}
              onPress={() => {
                setJoinedSuccess(false);
                router.replace('/(app)');
              }}
            />
          </View>
        </View>
      ) : null}

      <QuizShareSheet
        visible={shareVisible}
        quizId={quiz.id || id}
        quizTitle={quiz.title}
        onClose={() => setShareVisible(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  cover: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: Spacing.three,
  },
  coverPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: { fontWeight: '700', fontSize: 14 },
  catBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  catBadgeText: { ...titleTypeface, fontSize: 13, fontWeight: '700' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.one,
  },
  langNote: {
    ...bodyTypeface,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  startBox: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.two,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSelected,
  },
  startTextCol: { width: '100%', gap: 4 },
  startLine: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    textTransform: 'capitalize',
  },
  tzHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  countdownInline: {
    alignSelf: 'flex-start',
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
    fontVariant: ['tabular-nums'],
  },
  entryLine: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.three,
    lineHeight: 20,
  },
  earlyJoinCard: {
    width: '100%',
    marginBottom: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 16,
    backgroundColor: '#FFFBF3',
    borderWidth: 1,
    borderColor: '#F5E0B8',
    gap: 6,
  },
  earlyJoinKicker: {
    ...titleTypeface,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#B45309',
  },
  earlyJoinTitle: {
    ...titleTypeface,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 23,
  },
  earlyJoinNow: {
    ...bodyTypeface,
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    lineHeight: 20,
  },
  earlyJoinToggle: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFEFD4',
  },
  earlyJoinToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  earlyJoinChevron: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  earlyJoinTable: {
    marginTop: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF8EB',
  },
  earlyJoinRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0D9A8',
  },
  earlyJoinTierPos: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  earlyJoinTierBonus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  prizePanel: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  prizeLockedCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  prizeLockedMessage: {
    ...bodyTypeface,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  prizeLockedCounter: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
    marginTop: Spacing.one,
  },
  prizeLockedCaption: {
    ...bodyTypeface,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    letterSpacing: 0.2,
  },
  prizeWash: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  prizeList: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.three,
  },
  prizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(28,25,23,0.08)',
  },
  prizeRowLast: {
    borderBottomWidth: 0,
  },
  prizeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
    paddingRight: 8,
  },
  prizeAmount: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  inviteBlock: {
    marginTop: Spacing.four,
    gap: 8,
    alignItems: 'flex-start',
  },
  inviteHint: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  inviteLink: {
    paddingVertical: 2,
  },
  inviteLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textDecorationLine: 'underline',
  },
  tipList: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  joinedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,25,23,0.45)',
    justifyContent: 'flex-end',
    paddingHorizontal: 0,
    zIndex: 40,
  },
  joinedCard: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.light.backgroundSelected,
  },
  joinedTitle: {
    ...titleTypeface,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  joinedBody: {
    ...bodyTypeface,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  joinedMarks: {
    ...bodyTypeface,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  blockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 6,
  },
  emptyCreator: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
  },
  creatorBy: {
    marginTop: Spacing.three,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  description: { color: Colors.light.text, lineHeight: 22 },
  tips: { color: Colors.light.text, lineHeight: 22 },
  meta: { marginTop: Spacing.two, fontWeight: '700', color: Colors.light.primary },
  info: { color: Colors.light.textSecondary, fontSize: 14 },
  errorBody: {
    color: '#B42318',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  errorHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.four,
  },
});
