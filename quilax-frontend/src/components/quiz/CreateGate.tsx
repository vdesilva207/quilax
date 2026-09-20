import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import apiClient from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AppScreen, AppHeader, AppSection, AppCard } from '@/components/ui/AppScreen';
import { GradientButton, InfoBar } from '@/components/ui/ScreenChrome';

/** Every N finished plays unlocks 1 create slot. */
const PLAYS_PER_CREATE = 10;

/** Soft-launch: ONLY this email skips the ratio gate (no role bypass). */
const CREATE_GATE_BYPASS_EMAILS = ['quilax@appquilax.com'];

type CreateGateProps = {
  children: React.ReactNode;
};

function isBypassEmail(email?: string | null) {
  return CREATE_GATE_BYPASS_EMAILS.includes(String(email || '').trim().toLowerCase());
}

/**
 * Ratio gate: floor(played / 10) create slots.
 * Bypass exclusively for CREATE_GATE_BYPASS_EMAILS.
 */
export default function CreateGate({ children }: CreateGateProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [played, setPlayed] = useState(0);
  const [created, setCreated] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Fast path: known allowlisted session — no network needed.
      if (isBypassEmail(user?.email)) {
        if (!cancelled) {
          setUnlocked(true);
          setLoading(false);
        }
        return;
      }

      try {
        if (token) apiClient.setToken(token);
        const res = await apiClient.get('/profile/me').catch(() => null);
        const profile = res?.profile || res?.data?.profile || res?.user || res?.data || res;
        const email = profile?.email || user?.email;
        if (isBypassEmail(email)) {
          if (!cancelled) {
            setUnlocked(true);
            setLoading(false);
          }
          return;
        }

        const playedCount = Number(
          profile?.statistics?.quizzesCompleted ??
            profile?.statistics?.quizzesParticipated ??
            profile?.quizzesPlayed ??
            0,
        );
        const createdCount = Number(
          profile?.statistics?.quizzesCreated ?? profile?._count?.createdQuizzes ?? 0,
        );
        const playedSafe = Number.isFinite(playedCount) ? playedCount : 0;
        const createdSafe = Number.isFinite(createdCount) ? createdCount : 0;
        const slots = Math.floor(playedSafe / PLAYS_PER_CREATE);

        if (!cancelled) {
          setPlayed(playedSafe);
          setCreated(createdSafe);
          setUnlocked(createdSafe < slots);
        }
      } catch {
        if (!cancelled) {
          setPlayed(0);
          setCreated(0);
          setUnlocked(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.email, token]);

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

  const slots = Math.floor(played / PLAYS_PER_CREATE);
  const needForNext = (created + 1) * PLAYS_PER_CREATE - played;
  const remaining = Math.max(needForNext, 0);
  const progressInCycle = played % PLAYS_PER_CREATE;
  const pct = Math.min((progressInCycle / PLAYS_PER_CREATE) * 100, 100);

  return (
    <AppScreen>
      <AppHeader title={t('createGate.title')} subtitle={t('createGate.subtitle')} />
      <AppSection title={t('createGate.progressSection')} accentIndex={2}>
        <InfoBar>
          <Text style={styles.info}>{t('createGate.info', { count: PLAYS_PER_CREATE })}</Text>
        </InfoBar>
        <AppCard>
          <Text style={styles.count}>
            {played} {t('createGate.playedLabel')} · {created} {t('createGate.createdLabel')}
          </Text>
          <Text style={styles.slots}>
            {t('createGate.slots', { used: created, allowed: slots })}
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
  count: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  slots: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: Spacing.two,
  },
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
