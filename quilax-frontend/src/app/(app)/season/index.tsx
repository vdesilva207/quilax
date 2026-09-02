import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, titleTypeface } from '@/constants/theme';
import { APP_GRADIENT, GRADIENT_DIAGONAL } from '@/constants/gradients';
import apiClient from '@/lib/api';
import { AppScreen, AppHeader } from '@/components/ui/AppScreen';
import { ConfettiBurst } from '@/components/ConfettiBurst';

type TabKey = 'winners' | 'ranking' | 'about';

function winnerName(entry: any, fallback: string) {
  return entry?.user?.fullName || entry?.user?.username || entry?.user?.email || fallback;
}

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

export default function SeasonScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: TabKey =
    params.tab === 'ranking' || params.tab === 'about' || params.tab === 'winners'
      ? params.tab
      : 'winners';
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [season, setSeason] = useState<any>(null);
  const [winners, setWinners] = useState<any[]>([]);
  const [currentSeason, setCurrentSeason] = useState<any>(null);
  const [liveRanking, setLiveRanking] = useState<any[]>([]);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [prevRes, activeRes] = await Promise.all([
        apiClient.get('/seasons/previous'),
        apiClient.get('/seasons/active').catch(() => null),
      ]);
      const prev = prevRes?.data || prevRes;
      setSeason(prev?.season || null);
      setWinners(Array.isArray(prev?.winners) ? prev.winners : []);
      const active = activeRes?.data || activeRes;
      const activeSeason = active && active.id ? active : active?.season || null;
      setCurrentSeason(activeSeason);
      if (activeSeason?.id) {
        setRankingLoading(true);
        try {
          const rankRes = await apiClient.get(`/seasons/${activeSeason.id}/ranking?limit=300`);
          const rows = rankRes?.ranking || rankRes?.data?.ranking || (Array.isArray(rankRes) ? rankRes : []);
          setLiveRanking(Array.isArray(rows) ? rows : []);
        } catch {
          setLiveRanking([]);
        } finally {
          setRankingLoading(false);
        }
      } else {
        setLiveRanking([]);
      }
    } catch (e: any) {
      setError(e?.message || t('seasonDetail.loadError'));
      setSeason(null);
      setWinners([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (tab !== 'winners' || !season) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 4200);
    return () => clearTimeout(timer);
  }, [tab, season]);

  const jackpot = season?.jackpotPool ?? 0;
  const seasonName = season?.name || t('seasonDetail.previousFallback');
  const endsAt = currentSeason?.endsAt ? new Date(currentSeason.endsAt).getTime() : null;
  const parts = endsAt != null ? splitCountdown(endsAt - now) : null;
  const tiles = parts
    ? [
        { value: parts.d, label: t('home.countdownDay') },
        { value: parts.h, label: t('home.countdownHour') },
        { value: parts.m, label: t('home.countdownMin') },
        { value: parts.s, label: t('home.countdownSec') },
      ]
    : null;

  const creditsLabel = t('seasonDetail.credits');

  return (
    <View style={styles.root}>
      {tab === 'winners' && season && showConfetti ? <ConfettiBurst active /> : null}

      <AppScreen>
        <AppHeader
          title={t('seasonDetail.title')}
          subtitle={t('seasonDetail.subtitle')}
          showBack
        />

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('winners')}
            style={[styles.tab, tab === 'winners' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'winners' && styles.tabTextActive]}>
              {t('seasonDetail.tabWinners')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('ranking')}
            style={[styles.tab, tab === 'ranking' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'ranking' && styles.tabTextActive]}>
              {t('seasonDetail.tabRanking')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('about')}
            style={[styles.tab, tab === 'about' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'about' && styles.tabTextActive]}>
              {t('seasonDetail.tabAbout')}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : tab === 'winners' ? (
          <View style={styles.panel}>
            {!season ? (
              <LinearGradient
                colors={[...APP_GRADIENT]}
                locations={[0, 0.28, 0.55, 1]}
                start={GRADIENT_DIAGONAL.start}
                end={GRADIENT_DIAGONAL.end}
                style={styles.emptyHero}
              >
                <Text style={styles.emptyHeroTitle}>{t('seasonDetail.emptyStart')}</Text>
                <Text style={styles.emptyHeroSub}>{t('seasonDetail.emptyStartSub')}</Text>
              </LinearGradient>
            ) : (
              <>
                <LinearGradient
                  colors={[...APP_GRADIENT]}
                  locations={[0, 0.28, 0.55, 1]}
                  start={GRADIENT_DIAGONAL.start}
                  end={GRADIENT_DIAGONAL.end}
                  style={styles.jackpotCard}
                >
                  <Text style={styles.jackpotEyebrow}>{t('seasonDetail.pastJackpot')}</Text>
                  <Text style={styles.jackpotValue}>
                    {Math.round(jackpot)} {creditsLabel}
                  </Text>
                  <Text style={styles.jackpotSeason}>
                    {t('seasonDetail.pastSeasonName', { name: seasonName })}
                  </Text>
                </LinearGradient>

                <Text style={styles.motivate}>{t('seasonDetail.winnersMotivate')}</Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                {winners.length === 0 ? (
                  <Text style={styles.empty}>{t('seasonDetail.noWinners')}</Text>
                ) : (
                  <View style={styles.list}>
                    <Text style={styles.listTitle}>{t('seasonDetail.winnersList')}</Text>
                    {winners.map((item, index) => {
                      const pos = item.position ?? index + 1;
                      const medal =
                        pos === 1
                          ? styles.gold
                          : pos === 2
                            ? styles.silver
                            : pos === 3
                              ? styles.bronze
                              : null;
                      return (
                        <View key={String(item.id || item.userId || index)} style={styles.row}>
                          <View style={[styles.pos, medal]}>
                            <Text style={[styles.posText, medal && styles.posMedal]}>{pos}</Text>
                          </View>
                          <View style={styles.rowBody}>
                            <Text style={styles.name} numberOfLines={1}>
                              {winnerName(item, t('home.player', { id: item.userId }))}
                            </Text>
                            <Text style={styles.meta}>
                              {item.points != null ? `${item.points} pts` : ''}
                              {item.creditsAwarded != null
                                ? ` · ${item.creditsAwarded} ${creditsLabel}`
                                : ''}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        ) : tab === 'ranking' ? (
          <View style={styles.panel}>
            <Text style={styles.listTitle}>
              {currentSeason?.name
                ? t('home.seasonTitle', { name: currentSeason.name })
                : t('home.seasonInProgress')}
            </Text>
            <Text style={styles.motivate}>{t('seasonDetail.liveRankingSub')}</Text>
            {rankingLoading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: 24 }} />
            ) : liveRanking.length === 0 ? (
              <Text style={styles.empty}>{t('home.noRanking')}</Text>
            ) : (
              <View style={styles.list}>
                {liveRanking.map((item, index) => {
                  const pos = item.position ?? index + 1;
                  const medal =
                    pos === 1
                      ? styles.gold
                      : pos === 2
                        ? styles.silver
                        : pos === 3
                          ? styles.bronze
                          : null;
                  const name = winnerName(item, t('home.player', { id: item.userId }));
                  const photo = item.user?.profilePhoto;
                  const initial = name.trim().charAt(0).toUpperCase();
                  return (
                    <View key={String(item.id || item.userId || index)} style={styles.row}>
                      <View style={[styles.pos, medal]}>
                        <Text style={[styles.posText, medal && styles.posMedal]}>{pos}</Text>
                      </View>
                      {photo ? (
                        <Image source={{ uri: photo }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitial}>{initial}</Text>
                        </View>
                      )}
                      <View style={styles.rowBody}>
                        <Text style={styles.name} numberOfLines={1}>
                          {name}
                        </Text>
                        <Text style={styles.meta}>{item.points ?? 0} pts</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.about}>
            <LinearGradient
              colors={[...APP_GRADIENT]}
              locations={[0, 0.35, 0.72, 1]}
              start={GRADIENT_DIAGONAL.start}
              end={GRADIENT_DIAGONAL.end}
              style={styles.aboutHero}
            >
              <Text style={styles.aboutHeroEyebrow}>{t('seasonDetail.aboutEyebrow')}</Text>
              <Text style={styles.aboutHeroTitle}>{t('seasonDetail.aboutTitle')}</Text>
              <Text style={styles.aboutHeroBody}>{t('seasonDetail.aboutLead')}</Text>
            </LinearGradient>

            <View style={styles.aboutCards}>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutCardTitle}>{t('seasonDetail.aboutCard1Title')}</Text>
                <Text style={styles.aboutCardBody}>{t('seasonDetail.aboutP1')}</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutCardTitle}>{t('seasonDetail.aboutCard2Title')}</Text>
                <Text style={styles.aboutCardBody}>{t('seasonDetail.aboutP2')}</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutCardTitle}>{t('seasonDetail.aboutCard3Title')}</Text>
                <Text style={styles.aboutCardBody}>{t('seasonDetail.aboutP3')}</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutCardTitle}>{t('seasonDetail.aboutCard4Title')}</Text>
                <Text style={styles.aboutCardBody}>{t('seasonDetail.aboutP4')}</Text>
              </View>
            </View>

            <Text style={styles.aboutMotivate}>{t('seasonDetail.aboutMotivate')}</Text>

            <LinearGradient
              colors={[APP_GRADIENT[0], APP_GRADIENT[1], APP_GRADIENT[2]]}
              start={GRADIENT_DIAGONAL.start}
              end={GRADIENT_DIAGONAL.end}
              style={styles.aboutCountdown}
            >
              <Text style={styles.aboutCountdownLabel}>
                {currentSeason?.name
                  ? t('home.seasonTitle', { name: currentSeason.name })
                  : t('home.seasonInProgress')}
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
                <Text style={styles.aboutCountdownEmpty}>{t('home.noSeason')}</Text>
              )}
            </LinearGradient>
          </View>
        )}
      </AppScreen>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    padding: 4,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSelected,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.light.backgroundElement,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.text,
  },
  centered: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  panel: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  emptyHero: {
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyHeroTitle: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  emptyHeroSub: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  jackpotCard: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  jackpotEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
  },
  jackpotValue: {
    ...titleTypeface,
    marginTop: 6,
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  jackpotSeason: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  motivate: {
    ...titleTypeface,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.three,
    lineHeight: 22,
  },
  listTitle: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 10,
  },
  list: {
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  pos: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSelected,
  },
  gold: { backgroundColor: '#F5D76E' },
  silver: { backgroundColor: '#D1D5DB' },
  bronze: { backgroundColor: '#E8B4A0' },
  posText: { fontSize: 13, fontWeight: '800', color: Colors.light.text },
  posMedal: { color: '#1C1917' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: Colors.light.backgroundElement,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSelected,
  },
  avatarInitial: {
    fontWeight: '800',
    color: Colors.light.text,
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  meta: { fontSize: 12, fontWeight: '600', color: Colors.light.textSecondary },
  empty: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 28,
  },
  error: {
    color: '#B42318',
    fontWeight: '700',
    marginBottom: 8,
  },
  about: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: 16,
  },
  aboutHero: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  aboutHeroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  aboutHeroTitle: {
    ...titleTypeface,
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  aboutHeroBody: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.92)',
  },
  aboutCards: { gap: 10 },
  aboutCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
  },
  aboutCardTitle: {
    ...titleTypeface,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 6,
  },
  aboutCardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
  },
  aboutMotivate: {
    ...titleTypeface,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: Colors.light.text,
    lineHeight: 24,
  },
  aboutCountdown: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  aboutCountdownLabel: {
    ...titleTypeface,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  aboutCountdownEmpty: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  countdownRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 8,
  },
  countdownTile: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
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
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
  },
});
