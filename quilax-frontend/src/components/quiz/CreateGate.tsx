import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';

const REQUIRED_PLAYED = 10;
/** Primeros 1000 usuarios: hasta 5 quizzes sin exigir partidas (alineado con backend). */
const EARLY_ADOPTER_LIMIT = 1000;
const EARLY_ADOPTER_FREE_QUIZZES = 5;

type CreateGateProps = {
  children: React.ReactNode;
};

/**
 * Blocks quiz creation until the user has played REQUIRED_PLAYED quizzes.
 * Admin and early-adopter free quota bypass the gate.
 */
export default function CreateGate({ children }: CreateGateProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [played, setPlayed] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/profile/me').catch(() => null);
        const profile = res?.profile || res?.data?.profile || res?.user || res?.data || res;
        const role = profile?.role;
        const userId = Number(profile?.id) || 0;
        const created = Number(profile?.statistics?.quizzesCreated ?? profile?._count?.createdQuizzes ?? 0);
        const count = Number(
          profile?.statistics?.quizzesParticipated ??
            profile?.statistics?.quizzesCompleted ??
            profile?.quizzesPlayed ??
            0,
        );

        const isAdmin = role === 'ADMIN' || role === 'ADMIN_WORKER';
        const earlyFree =
          userId > 0 &&
          userId <= EARLY_ADOPTER_LIMIT &&
          created < EARLY_ADOPTER_FREE_QUIZZES;

        setPlayed(Number.isFinite(count) ? count : 0);
        setUnlocked(isAdmin || earlyFree || count >= REQUIRED_PLAYED);
      } catch {
        setPlayed(0);
        setUnlocked(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  const remaining = Math.max(REQUIRED_PLAYED - played, 0);
  const pct = Math.min((played / REQUIRED_PLAYED) * 100, 100);

  return (
    <AppScreen>
      <AppHeader title={t('createGate.title')} subtitle={t('createGate.subtitle')} />
      <AppSection title={t('createGate.progressSection')} accentIndex={2}>
        <InfoBar>
          <Text style={styles.info}>{t('createGate.info', { count: REQUIRED_PLAYED })}</Text>
        </InfoBar>
        <AppCard>
          <Text style={styles.count}>
            {played}/{REQUIRED_PLAYED}
          </Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.remaining}>{t('createGate.remaining', { count: remaining })}</Text>
        </AppCard>
        <GradientButton
          label={t('createGate.searchQuizzes')}
          onPress={() => router.push('/(app)/search')}
        />
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
  info: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20 },
  count: { fontSize: 32, fontWeight: '800', color: Colors.light.text, marginBottom: Spacing.two },
  barBg: {
    height: 8,
    backgroundColor: Colors.light.backgroundSelected,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.light.gradientStart,
  },
  remaining: { marginTop: Spacing.two, color: Colors.light.textSecondary, fontWeight: '600' },
});
