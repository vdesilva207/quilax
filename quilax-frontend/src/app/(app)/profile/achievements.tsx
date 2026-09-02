import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, Switch, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import settingsService from '@/services/settingsService';
import { AppScreen, AppHeader, AppSection, AppCard, AppPlaceholder } from '@/components/ui/AppScreen';
import CustomIcon from '@/components/CustomIcon';

type Profile = {
  statistics?: {
    quizzesCreated: number;
    quizzesParticipated: number;
    quizzesCompleted: number;
    quizzesWon: number;
  };
  winnings?: {
    totalCredits: number;
    totalWins: number;
    averageCreditsPerWin: number;
  };
  bestScores?: Array<{ id: number; score: number; quiz: { title: string; difficulty?: string }; createdAt: string }>;
};

type Privacy = {
  profilePublic: boolean;
  showQuizHistory: boolean;
  showPrizes: boolean;
};

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [privacy, setPrivacy] = useState<Privacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, privacyRes] = await Promise.all([
          apiClient.get('/profile/me').catch(() => null),
          settingsService.getPrivacySettings(),
        ]);
        if (profileRes?.profile) {
          setProfile(profileRes.profile);
        }
        if (privacyRes.success) {
          const p = privacyRes.data?.privacy || privacyRes.data;
          if (p) setPrivacy(p);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const togglePrivacy = async (key: keyof Privacy) => {
    if (!privacy) return;
    const next = { ...privacy, [key]: !privacy[key] };
    setPrivacy(next);
    setSavingKey(key);
    const result = await settingsService.updatePrivacySettings({ [key]: next[key] });
    setSavingKey(null);
    if (!result.success) {
      setPrivacy(privacy);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <AppHeader title={t('profile.achievementsTitle')} showBack backHref="/(app)/profile" />
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      </AppScreen>
    );
  }

  const stats = profile?.statistics;
  const winnings = profile?.winnings;
  const bestScores = profile?.bestScores || [];

  const badges: string[] = [];
  if (stats?.quizzesWon) badges.push(t('profile.badgeWinner'));
  if ((stats?.quizzesCreated ?? 0) > 0) badges.push(t('profile.badgeCreator'));
  if ((stats?.quizzesParticipated ?? 0) >= 10) badges.push(t('profile.badgeQuizMaster'));
  if ((winnings?.totalWins ?? 0) >= 5) badges.push(t('profile.badgeWinStreak'));

  return (
    <AppScreen>
      <AppHeader title={t('profile.achievementsTitle')} showBack backHref="/(app)/profile" />

      <AppSection title={t('profile.historyPrivacySection')} accentIndex={2}>
        <AppCard>
          <View style={styles.privacyRow}>
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>{t('profile.publicProfileToggle')}</Text>
              <Text style={styles.privacySubtitle}>{t('profile.publicProfileToggleSub')}</Text>
            </View>
            <Switch
              value={!!privacy?.profilePublic}
              onValueChange={() => togglePrivacy('profilePublic')}
              disabled={savingKey === 'profilePublic' || !privacy}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
          <View style={styles.privacyRow}>
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>{t('profile.showHistoryToggle')}</Text>
              <Text style={styles.privacySubtitle}>{t('profile.visibleOnPublicProfile')}</Text>
            </View>
            <Switch
              value={!!privacy?.showQuizHistory}
              onValueChange={() => togglePrivacy('showQuizHistory')}
              disabled={savingKey === 'showQuizHistory' || !privacy}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
          <View style={[styles.privacyRow, styles.privacyRowLast]}>
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>{t('profile.showPrizesToggle')}</Text>
              <Text style={styles.privacySubtitle}>{t('profile.visibleOnPublicProfile')}</Text>
            </View>
            <Switch
              value={!!privacy?.showPrizes}
              onValueChange={() => togglePrivacy('showPrizes')}
              disabled={savingKey === 'showPrizes' || !privacy}
              trackColor={{ false: Colors.light.backgroundSelected, true: Colors.light.gradientStart }}
            />
          </View>
        </AppCard>
      </AppSection>

      <AppSection title={t('profile.yourHistorySection')} accentIndex={0}>
        <AppCard>
          <Text style={styles.statLine}>
            <Text style={styles.statValue}>{stats?.quizzesParticipated ?? 0}</Text> {t('profile.statsPlayedLabel')}
          </Text>
          <Text style={styles.statLine}>
            <Text style={styles.statValue}>{stats?.quizzesWon ?? 0}</Text> {t('profile.statsWonLabel')}
          </Text>
          <Text style={[styles.statLine, styles.statLineLast]}>
            <Text style={styles.statValue}>{stats?.quizzesCreated ?? 0}</Text> {t('profile.statsCreatedLabel')}
          </Text>
        </AppCard>
      </AppSection>

      <AppSection title={t('profile.bestScoresSection')} accentIndex={1}>
        {bestScores.length === 0 ? (
          <AppPlaceholder text={t('profile.noScoresYet')} />
        ) : (
          bestScores.map((s) => (
            <AppCard key={s.id}>
              <Text style={styles.itemTitle}>{s.quiz?.title || t('profile.quizFallback')}</Text>
              <Text style={styles.itemDate}>
                {t('profile.scoreLabel', { score: s.score })} · {new Date(s.createdAt).toLocaleDateString()}
              </Text>
            </AppCard>
          ))
        )}
      </AppSection>

      <AppSection title={t('profile.prizesWonSection')} accentIndex={3}>
        {!winnings || winnings.totalWins === 0 ? (
          <AppPlaceholder text={t('profile.noPrizesYet')} />
        ) : (
          <>
            <AppCard>
              <View style={styles.prizeRow}>
                <CustomIcon name="trophy" size={20} color={Colors.light.gradientStart} />
                <Text style={styles.prizeTitle}>{t('profile.prizesWonCount', { count: winnings.totalWins })}</Text>
              </View>
            </AppCard>
            <AppCard>
              <View style={styles.prizeRow}>
                <CustomIcon name="winner" size={20} color={Colors.light.gradientStart} />
                <Text style={styles.prizeTitle}>{t('profile.totalCreditsLabel', { count: winnings.totalCredits })}</Text>
              </View>
            </AppCard>
          </>
        )}
      </AppSection>

      {badges.length > 0 ? (
        <AppSection title={t('profile.milestonesSection')} accentIndex={2}>
          <Text style={styles.milestoneHint}>{t('profile.milestonesHint')}</Text>
          <View style={styles.badgesContainer}>
            {badges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <CustomIcon name="star" size={18} color="#FFFFFF" />
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            ))}
          </View>
        </AppSection>
      ) : (
        <AppSection title={t('profile.milestonesSection')} accentIndex={2}>
          <Text style={styles.milestoneHint}>{t('profile.milestonesHint')}</Text>
          <AppPlaceholder text={t('profile.noMilestonesYet', { defaultValue: t('profile.noScoresYet') })} />
        </AppSection>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: Spacing.six, alignItems: 'center' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  privacyRowLast: { borderBottomWidth: 0 },
  privacyText: { flex: 1, paddingRight: Spacing.three },
  privacyTitle: { fontSize: 15, fontWeight: '600', color: Colors.light.text },
  privacySubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  milestoneHint: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
    lineHeight: 18,
  },
  statLine: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
  statLineLast: { marginBottom: 0 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.light.text },
  itemTitle: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  itemDate: { fontSize: 14, color: Colors.light.textSecondary, marginTop: Spacing.one },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  prizeTitle: { fontSize: 16, color: Colors.light.text, fontWeight: '600' },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.gradientStart,
    padding: Spacing.three,
    borderRadius: 8,
    gap: Spacing.two,
  },
  badgeText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
