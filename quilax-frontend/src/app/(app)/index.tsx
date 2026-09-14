import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, sora, titleTypeface } from '@/constants/theme';
import { APP_GRADIENT, GRADIENT_DIAGONAL, brandGradientProps } from '@/constants/gradients';
import apiClient from '@/lib/api';
import secureStorage from '@/lib/secureStorage';
import { useAuth } from '@/context/AuthContext';
import { AppScreen, AppSection, AppPlaceholder } from '@/components/ui/AppScreen';
import { QuizCard } from '@/components/QuizCard';
import { NestedScrollTray } from '@/components/HorizontalTray';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';
import {
  getPushPermissionStatus,
  registerForPushNotificationsAsync,
} from '@/services/pushNotifications';
import { formatQuizStart, resolveViewerTimezone } from '@/utils/timezone';
import { getCategoryLabel, getCategoryStyle } from '@/constants/quizCategories';
import { useChromeInsets } from '@/hooks/useChromeInsets';

const NOTIF_PROMPT_KEY = 'quilaxNotifPromptSeen';

function splitCountdown(ms: number) {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function formatShortCountdown(ms: number) {
  const parts = splitCountdown(ms);
  if (!parts) return null;
  if (parts.d > 0) return `${parts.d}d ${parts.h}h`;
  return `${String(parts.h).padStart(2, '0')}:${String(parts.m).padStart(2, '0')}:${String(parts.s).padStart(2, '0')}`;
}

function cleanSeasonName(raw?: string | null) {
  if (!raw) return null;
  return raw.replace(/\s*[·•\-–]\s*[A-Za-zÁÉÍÓÚáéíóúñÑ]+\s*$/, '').trim() || raw;
}

function quizStartRaw(quiz: any) {
  return quiz?.nextScheduledAt || quiz?.requestedDate || quiz?.schedules?.[0]?.scheduledAt || null;
}

function quizMetaStart(quiz: any) {
  const raw = quizStartRaw(quiz);
  if (!raw) return null;
  try {
    return formatQuizStart(raw, resolveViewerTimezone()).compactLabel;
  } catch {
    return null;
  }
}

function HomeHero({
  upcomingCount,
  seasonEndsLabel,
}: {
  upcomingCount: number;
  seasonEndsLabel: string | null;
}) {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0.45)).current;
  const chrome = useChromeInsets(Spacing.three + 8);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const liveText =
    upcomingCount <= 0
      ? t('home.liveLineNone')
      : upcomingCount === 1
        ? t('home.liveLineOne')
        : t('home.liveLine', { count: upcomingCount });

  return (
    <LinearGradient
      {...brandGradientProps}
      style={[styles.hero, { paddingTop: chrome.headerPaddingTop }]}
    >
      <Text style={styles.heroBrand}>QUILAX</Text>
      <Text style={styles.heroScreen}>{t('home.title')}</Text>

      <View style={styles.liveRow}>
        <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
        <Text style={styles.liveText}>{liveText}</Text>
      </View>
      {seasonEndsLabel ? (
        <Text style={styles.heroSeasonLine}>{t('home.seasonEndsIn', { time: seasonEndsLabel })}</Text>
      ) : null}
    </LinearGradient>
  );
}

function EnrolledUpcomingList({
  items,
  now,
  onOpen,
}: {
  items: any[];
  now: number;
  onOpen: (item: any) => void;
}) {
  const { t } = useTranslation();
  if (!items.length) return null;

  return (
    <View style={styles.enrolledBlock}>
      <Text style={styles.enrolledTitle}>{t('home.myEnrolled')}</Text>
      <View style={styles.enrolledList}>
        {items.map((item) => {
          const ms = item.startsAt ? new Date(item.startsAt).getTime() - now : 0;
          const time = formatShortCountdown(ms) || '—';
          const live = Boolean(item.activeRunId);
          return (
            <Pressable
              key={item.enrollmentId || item.quizId}
              onPress={() => onOpen(item)}
              style={({ pressed }) => [styles.enrolledRow, pressed && styles.ctaPressed]}
            >
              <View style={styles.enrolledMain}>
                <Text style={styles.enrolledName} numberOfLines={1}>
                  {item.title}
                </Text>
                {live ? (
                  <Text style={styles.enrolledCat} numberOfLines={1}>
                    {t('home.liveNow')}
                  </Text>
                ) : item.category ? (
                  <Text style={styles.enrolledCat} numberOfLines={1}>
                    {getCategoryLabel(item.category, t)}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.enrolledCountdownValue}>{live ? 'LIVE' : time}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NextQuizCard({ quiz, onPress }: { quiz: any | null; onPress: () => void }) {
  const { t } = useTranslation();
  if (!quiz) {
    return (
      <View style={styles.nextCardEmpty}>
        <Text style={styles.nextEyebrow}>{t('home.nextQuiz')}</Text>
        <Text style={styles.nextEmptyBody}>{t('home.noNextQuiz')}</Text>
      </View>
    );
  }

  const when = quizMetaStart(quiz);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.seasonPressed}>
      <LinearGradient
        colors={[APP_GRADIENT[0], APP_GRADIENT[1], APP_GRADIENT[2]]}
        start={GRADIENT_DIAGONAL.start}
        end={GRADIENT_DIAGONAL.end}
        style={styles.nextCard}
      >
        <Text style={styles.nextEyebrowLight}>{t('home.nextQuiz')}</Text>
        <Text style={styles.nextTitle} numberOfLines={2}>
          {quiz.title}
        </Text>
        {when ? <Text style={styles.nextMeta}>{t('home.nextQuizWhen', { when })}</Text> : null}
        {quiz.estimatedPrize != null ? (
          <Text style={styles.nextMeta}>
            {t('home.nextQuizPrize', { n: Math.round(quiz.estimatedPrize) })}
          </Text>
        ) : null}
        <View style={styles.nextCtaChip}>
          <Text style={styles.nextCtaText}>{t('home.nextQuizOpen')}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function SeasonBlock({
  name,
  color,
  jackpotPool,
  endsAt,
  now,
  ranking,
  paidPlaces,
  onOpenSeason,
}: {
  name?: string | null;
  color?: string | null;
  jackpotPool?: number | null;
  endsAt: number | null;
  now: number;
  ranking: any[];
  paidPlaces?: number | null;
  onOpenSeason: () => void;
}) {
  const { t } = useTranslation();
  const parts = endsAt != null ? splitCountdown(endsAt - now) : null;
  const seasonName = cleanSeasonName(name) || t('home.seasonInProgress');
  const accent = color && /^#/.test(color) ? color : APP_GRADIENT[2];
  const gradientColors = [APP_GRADIENT[0], APP_GRADIENT[1], accent, '#B91C1C'] as const;

  const tiles = parts
    ? [
        { value: parts.d, label: t('home.countdownDay') },
        { value: parts.h, label: t('home.countdownHour') },
        { value: parts.m, label: t('home.countdownMin') },
        { value: parts.s, label: t('home.countdownSec') },
      ]
    : null;

  return (
    <View style={styles.seasonBlock}>
      <Pressable onPress={onOpenSeason} style={({ pressed }) => pressed && styles.seasonPressed}>
        <LinearGradient
          colors={[...gradientColors]}
          locations={[0, 0.35, 0.72, 1]}
          start={GRADIENT_DIAGONAL.start}
          end={GRADIENT_DIAGONAL.end}
          style={styles.seasonCard}
        >
          <Text style={styles.seasonTitle} numberOfLines={1}>
            {t('home.seasonTitle', { name: seasonName })}
          </Text>

          {tiles ? (
            <View style={styles.countdownRow}>
              {tiles.map((tile) => (
                <View key={tile.label} style={styles.countdownTile}>
                  <Text style={styles.countdownValue}>
                    {String(tile.value).padStart(2, '0')}
                  </Text>
                  <Text style={styles.countdownUnit}>{tile.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.seasonEndedLabel}>
              {endsAt == null ? t('home.noSeason') : t('home.seasonEnded')}
            </Text>
          )}

          {jackpotPool != null && jackpotPool > 0 ? (
            <Text style={styles.jackpotText}>
              {t('home.seasonJackpot', { n: Math.round(jackpotPool) })}
            </Text>
          ) : null}

          <Text style={styles.seasonTapHint}>{t('home.seasonTapHint')}</Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.rankingPane}>
        <Text style={styles.rankingPaneTitle}>
          {paidPlaces
            ? t('home.seasonRankingPaid', { n: paidPlaces })
            : t('home.seasonRanking')}
        </Text>
        {ranking.length === 0 ? (
          <Text style={styles.rankingEmpty}>{t('home.noRanking')}</Text>
        ) : (
          <NestedScrollTray height={280} footerHint={t('home.scrollMore')}>
            {ranking.map((entry: any, i: number) => (
              <RankRow
                key={entry.id || entry.userId || i}
                index={i}
                name={
                  entry.user?.fullName ||
                  entry.user?.username ||
                  entry.user?.email ||
                  t('home.player', { id: entry.userId })
                }
                points={entry.points ?? 0}
                photo={entry.user?.profilePhoto}
              />
            ))}
          </NestedScrollTray>
        )}
      </View>
    </View>
  );
}

function RankRow({
  index,
  name,
  points,
  photo,
}: {
  index: number;
  name: string;
  points: number;
  photo?: string | null;
}) {
  const medal =
    index === 0 ? styles.rankGold : index === 1 ? styles.rankSilver : index === 2 ? styles.rankBronze : null;
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.rankRow, index === 0 && styles.rankRowFirst]}>
      <View style={[styles.rankBadge, medal]}>
        <Text style={[styles.rankIndex, medal && styles.rankIndexMedal]}>{index + 1}</Text>
      </View>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.rankAvatar} />
      ) : (
        <View style={styles.rankAvatarFallback}>
          <Text style={styles.rankAvatarInitial}>{initial}</Text>
        </View>
      )}
      <Text style={styles.rankName} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.rankPts}>{points} pts</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { token, isAuthenticated, logout } = useAuth();
  const [homeData, setHomeData] = useState<any>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  const loadData = useCallback(async () => {
    setLoadError('');
    try {
      if (token) apiClient.setToken(token);
      const homeResult = await apiClient.get('/home');
      const data = homeResult?.data || homeResult;
      if (!data || (!data.newestQuizzes && !data.hottestQuizzes)) {
        setLoadError(t('home.loadError'));
        setHomeData(null);
      } else {
        setHomeData(data);
        // Ranking aparte para no bloquear Inicio
        if (data.seasonRankingDeferred || !data.seasonRanking?.length) {
          apiClient
            .get('/home/season-ranking')
            .then((rankRes) => {
              const rankData = rankRes?.data || rankRes;
              const rows =
                rankData?.seasonRanking ||
                rankData?.ranking ||
                rankRes?.seasonRanking ||
                rankRes?.ranking ||
                [];
              const paid =
                rankData?.paidPlaces ||
                rankRes?.paidPlaces ||
                data?.currentSeason?.paidPlaces;
              setHomeData((prev: any) =>
                prev
                  ? {
                      ...prev,
                      seasonRanking: rows,
                      seasonPaidPlaces: paid ?? prev.seasonPaidPlaces,
                      currentSeason: prev.currentSeason
                        ? { ...prev.currentSeason, paidPlaces: paid ?? prev.currentSeason.paidPlaces }
                        : prev.currentSeason,
                    }
                  : prev,
              );
            })
            .catch(() => {});
        }
      }
    } catch (error: any) {
      console.error('Home load error:', error);
      if (error?.status === 401) {
        await logout();
        setLoadError('');
        setHomeData(null);
        return;
      }
      setLoadError(error?.message || t('home.loadError'));
      setHomeData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, token, logout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
  }, [isAuthenticated, loadData]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await secureStorage.getItem(NOTIF_PROMPT_KEY);
        if (seen === '1' || cancelled) return;
        const { granted } = await getPushPermissionStatus();
        if (granted) {
          await secureStorage.setItem(NOTIF_PROMPT_KEY, '1');
          return;
        }
        if (!cancelled) setShowNotifPrompt(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const markPromptSeen = async () => {
    await secureStorage.setItem(NOTIF_PROMPT_KEY, '1');
    setShowNotifPrompt(false);
  };

  const onAllowNotifications = async () => {
    await markPromptSeen();
    const result = await registerForPushNotificationsAsync();
    if (result.success) {
      Alert.alert(t('notif.enabledTitle'), t('notif.enabledBody'));
    } else if (result.reason === 'denied') {
      Alert.alert(t('notif.deniedTitle'), t('notif.deniedBody'));
    }
  };

  const onDenyNotifications = async () => {
    await markPromptSeen();
    Alert.alert(t('notif.dismissedTitle'), t('notif.dismissedBody'));
  };

  const endsAt = homeData?.currentSeason?.endsAt
    ? new Date(homeData.currentSeason.endsAt).getTime()
    : null;

  const ranking = homeData?.seasonRanking || [];
  const paidPlaces =
    homeData?.currentSeason?.paidPlaces ||
    homeData?.seasonPaidPlaces ||
    ranking.length ||
    null;
  const newest = homeData?.newestQuizzes || [];
  const hottest = homeData?.hottestQuizzes || [];
  const myUpcoming = homeData?.myUpcomingEnrollments || [];
  const nextQuiz = myUpcoming[0]
    ? {
        id: myUpcoming[0].quizId,
        title: myUpcoming[0].title,
        category: myUpcoming[0].category,
        nextScheduledAt: myUpcoming[0].startsAt,
      }
    : homeData?.nextQuiz || null;
  const upcomingCount = homeData?.upcomingCount ?? 0;
  const hotCategories = homeData?.hotCategories || [];
  const mySeason = homeData?.mySeason || null;
  const playStreak = homeData?.playStreak ?? 0;

  const seasonEndsLabel = useMemo(
    () => (endsAt != null ? formatShortCountdown(endsAt - now) : null),
    [endsAt, now],
  );

  if (loading) {
    return (
      <View style={styles.centered} testID="home-screen">
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <AppScreen
      testID="home-screen"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          tintColor={Colors.light.primary}
        />
      }
    >
      <NotificationPermissionModal
        visible={showNotifPrompt}
        onAllow={onAllowNotifications}
        onDeny={onDenyNotifications}
      />

      <HomeHero upcomingCount={upcomingCount} seasonEndsLabel={seasonEndsLabel} />

      <EnrolledUpcomingList
        items={myUpcoming}
        now={now}
        onOpen={(item) => {
          if (item?.activeRunId) {
            router.push(`/(app)/quiz/run/${item.activeRunId}`);
            return;
          }
          router.push(`/(app)/quiz/${item.quizId || item}`);
        }}
      />

      {loadError ? (
        <AppSection title={t('common.error')} accentIndex={3}>
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Text style={styles.errorHint}>{t('home.loadErrorHint')}</Text>
            <Pressable
              onPress={() => {
                setRefreshing(true);
                loadData();
              }}
              style={({ pressed }) => [styles.errorRetry, pressed && { opacity: 0.88 }]}
              accessibilityRole="button"
            >
              <Text style={styles.errorRetryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        </AppSection>
      ) : null}

      <View style={styles.nextWrap}>
        <NextQuizCard
          quiz={nextQuiz}
          onPress={() => {
            if (nextQuiz?.id) router.push(`/(app)/quiz/${nextQuiz.id}`);
            else router.push('/(app)/search');
          }}
        />
      </View>

      <View style={styles.standingWrap}>
        <Text style={styles.standingText}>
          {mySeason
            ? t('home.yourStanding', { rank: mySeason.rank, points: mySeason.points })
            : t('home.yourStandingNew')}
        </Text>
        {playStreak > 0 ? (
          <Text style={styles.streakText}>{t('home.streakLine', { n: playStreak })}</Text>
        ) : null}
      </View>

      {hotCategories.length > 0 ? (
        <View style={styles.catsBlock}>
          <Text style={styles.catsTitle}>{t('home.hotCategories')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catsRow}
          >
            {hotCategories.map((cat: any) => {
              const pastel = getCategoryStyle(cat.category);
              return (
                <Pressable
                  key={cat.category}
                  onPress={() =>
                    router.push(
                      `/(app)/search/results?category=${encodeURIComponent(cat.category)}` as any,
                    )
                  }
                  style={[
                    styles.catChip,
                    { backgroundColor: pastel.bg, borderColor: pastel.border },
                  ]}
                >
                  <Text style={[styles.catChipText, { color: pastel.text }]}>
                    {getCategoryLabel(cat.category, t)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <SeasonBlock
        name={homeData?.currentSeason?.name}
        color={homeData?.currentSeason?.color}
        jackpotPool={homeData?.currentSeason?.jackpotPool}
        endsAt={endsAt}
        now={now}
        ranking={ranking}
        paidPlaces={paidPlaces}
        onOpenSeason={() => router.push('/(app)/season')}
      />

      <AppSection title={t('home.newQuizzes')} accentIndex={1}>
        {newest.length === 0 ? (
          <AppPlaceholder
            text={t('home.noQuizzesYet')}
            actionLabel={t('home.ctaBrowse')}
            onAction={() => router.push('/(app)/search')}
          />
        ) : (
          <NestedScrollTray height={248} footerHint={t('home.scrollMore')}>
            {newest.map((quiz: any, index: number) => (
              <QuizCard
                key={`new-${quiz.id}`}
                dense
                staggerIndex={index}
                title={quiz.title}
                category={quiz.category}
                language={quiz.language}
                meta={
                  [
                    quizMetaStart(quiz),
                    quiz.difficulty != null ? t('home.difficulty', { n: quiz.difficulty }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || t('home.new')
                }
                onPress={() => router.push(`/(app)/quiz/${quiz.id}`)}
              />
            ))}
          </NestedScrollTray>
        )}
      </AppSection>

      <AppSection title={t('home.hottest')} accentIndex={2}>
        {hottest.length === 0 ? (
          <AppPlaceholder
            text={t('home.noHotQuizzes')}
            actionLabel={t('home.ctaBrowse')}
            onAction={() => router.push('/(app)/search')}
          />
        ) : (
          <NestedScrollTray height={248} footerHint={t('home.scrollMore')}>
            {hottest.map((quiz: any, index: number) => (
              <QuizCard
                key={`hot-${quiz.id}`}
                dense
                staggerIndex={index}
                title={quiz.title}
                category={quiz.category}
                language={quiz.language}
                meta={
                  [
                    quizMetaStart(quiz),
                    quiz.estimatedPrize != null ? `~${quiz.estimatedPrize} cr` : null,
                    quiz.enrollmentCount != null
                      ? t('home.enrolled', { n: quiz.enrollmentCount })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || t('home.popular')
                }
                onPress={() => router.push(`/(app)/quiz/${quiz.id}`)}
              />
            ))}
          </NestedScrollTray>
        )}
      </AppSection>
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
  hero: {
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    overflow: 'hidden',
    minHeight: 210,
  },
  heroBrand: {
    ...sora(800),
    fontSize: 40,
    color: '#FFFFFF',
    letterSpacing: 2.4,
  },
  heroScreen: {
    ...sora(700),
    marginTop: 4,
    fontSize: 15,
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.3,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FDE68A',
  },
  liveText: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSeasonLine: {
    ...titleTypeface,
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  ctaPressed: { opacity: 0.88 },
  nextWrap: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  nextCard: {
    borderRadius: 20,
    padding: 18,
  },
  nextCardEmpty: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  nextEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  nextEyebrowLight: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  nextTitle: {
    ...titleTypeface,
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nextMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  nextEmptyBody: {
    marginTop: 8,
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  nextCtaChip: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  nextCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  standingWrap: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  standingText: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  streakText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  catsBlock: {
    marginTop: Spacing.four,
  },
  enrolledBlock: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
  },
  enrolledTitle: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 10,
  },
  enrolledList: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  enrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  enrolledMain: {
    flex: 1,
    gap: 2,
  },
  enrolledName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  enrolledCat: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  enrolledCountdownValue: {
    ...titleTypeface,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 64,
    textAlign: 'right',
  },
  catsTitle: {
    ...titleTypeface,
    marginHorizontal: Spacing.four,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
  },
  catsRow: {
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    marginHorizontal: Spacing.four,
    padding: Spacing.four,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    gap: 6,
  },
  errorText: {
    color: '#B42318',
    fontWeight: '700',
    fontSize: 14,
  },
  errorHint: {
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  errorRetry: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 12,
    backgroundColor: '#B42318',
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  seasonBlock: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  seasonPressed: {
    opacity: 0.92,
  },
  seasonCard: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  seasonTitle: {
    ...titleTypeface,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  seasonTapHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 14,
    gap: 8,
  },
  countdownTile: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownValue: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countdownUnit: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
  seasonEndedLabel: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  jackpotText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  rankingPane: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: Colors.light.backgroundElement,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.backgroundSelected,
  },
  rankingPaneTitle: {
    ...titleTypeface,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  rankingEmpty: {
    paddingVertical: 18,
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  rankingLink: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rankingLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  rankRowFirst: {},
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  rankAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSelected,
  },
  rankAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSelected,
  },
  rankAvatarInitial: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
  },
  rankGold: { backgroundColor: '#F5D76E' },
  rankSilver: { backgroundColor: '#D1D5DB' },
  rankBronze: { backgroundColor: '#E8B4A0' },
  rankIndex: { fontSize: 13, fontWeight: '800', color: Colors.light.text },
  rankIndexMedal: { color: '#1C1917' },
  rankName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.light.text },
  rankPts: { fontSize: 14, fontWeight: '700', color: Colors.light.primary },
});
