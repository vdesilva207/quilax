import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, MaxContentWidth, titleTypeface } from '@/constants/theme';
import { brandGradientProps, APP_GRADIENT_SOFT } from '@/constants/gradients';
import { MobileModalFrame } from '@/components/ui/MobileModalFrame';
import quizRunService from '@/services/quizRunService';
import apiClient from '@/lib/api';
import secureStorage from '@/lib/secureStorage';
import { subscribeQuizRun } from '@/lib/quizSocket';
import { useAuth } from '@/context/AuthContext';
import { useQuizPlayUi } from '@/context/QuizPlayUiContext';

/** Soft Quilax accents (not solid “trivia tile” colors) */
const OPTION_ACCENTS = [
  Colors.light.gradientStart,
  Colors.light.gradientMiddle,
  Colors.light.pink,
  Colors.light.gradientEnd,
];

function officialOptions(question: any) {
  const raw = question?.answers || question?.options || [];
  return (raw as any[]).filter((a) => a == null || a.userId == null);
}

function BreathDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.breathOuter, style]}>
      <LinearGradient {...brandGradientProps} style={styles.breathInner} />
    </Animated.View>
  );
}

/** mm:ss until PRE_START ends / quiz starts */
function formatLobbyCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function AnswerTimer({ secondsRemaining }: { secondsRemaining: number | null }) {
  const pop = useSharedValue(1);

  useEffect(() => {
    pop.value = withSequence(
      withTiming(1.06, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 120, easing: Easing.inOut(Easing.quad) }),
    );
  }, [secondsRemaining, pop]);

  const numStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));

  return (
    <View style={styles.answerTimerWrap}>
      <Animated.Text style={[styles.answerTimerNum, numStyle]}>
        {secondsRemaining ?? '—'}
      </Animated.Text>
    </View>
  );
}

function RankGainBadge({ gain }: { gain: number }) {
  if (!gain || gain <= 0) return null;
  return (
    <Animated.Text
      entering={FadeInUp.duration(260).easing(Easing.out(Easing.cubic))}
      style={styles.rankGain}
    >
      +{gain}
    </Animated.Text>
  );
}

type QuizRunViewProps = {
  runId: string | number;
};

export default function QuizRunView({ runId }: QuizRunViewProps) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth() as any;
  const { setHideTabBar } = useQuizPlayUi();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<any>(null);
  const [playState, setPlayState] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastResult, setLastResult] = useState<{ isCorrect?: boolean; score?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any | null>(null);
  const [results, setResults] = useState<any>(null);
  const [resultsReady, setResultsReady] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [finishCeremony, setFinishCeremony] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const congratsShown = useRef(false);
  const disconnectSent = useRef(false);
  const submittingRef = useRef(false);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshAbort = useRef<AbortController | null>(null);
  const offlineKickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const introShownFor = useRef<string | null>(null);

  const numericRunId = useMemo(() => Number(runId), [runId]);
  const dismissKey = `quizPrizeDismissed:${numericRunId}`;

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(tick);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshAbort.current?.abort();
    const ac = new AbortController();
    refreshAbort.current = ac;
    const run = (async () => {
      try {
        const [runResult, playResult] = await Promise.all([
          quizRunService.getRunState(numericRunId, { signal: ac.signal }),
          apiClient
            .get(`/quiz-play/${numericRunId}/state`, { signal: ac.signal, timeoutMs: 10000 })
            .catch(() => null),
        ]);
        if (ac.signal.aborted) return;
        if (runResult.success) {
          setState(runResult.data);
          setError(null);
          setReconnecting(false);
        } else if (runResult.code === 'TIMEOUT') {
          setReconnecting(true);
        } else if (runResult.error) {
          setError(runResult.error);
        }
        if (playResult) {
          setPlayState(playResult);
          setReconnecting(false);
        }
      } catch (err: any) {
        if (ac.signal.aborted) return;
        if (err?.code === 'TIMEOUT') {
          setReconnecting(true);
          return;
        }
        setError(err.message || t('quizPlay.loadError'));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
        if (refreshInFlight.current === run) refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = run;
    return run;
  }, [numericRunId, t]);

  // Initial fetch + socket-driven updates (HTTP only on reconnect / fallback)
  useEffect(() => {
    refresh();
    // Safety: never leave the entry spinner forever if requests hang oddly
    const safety = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setReconnecting(true);
        return false;
      });
    }, 15000);
    return () => {
      clearTimeout(safety);
      refreshAbort.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;
    let socketOk = false;
    let lastPhase: string | null = null;
    let lastIndex: number | null = null;
    let participantsHint = 0;

    const fetchPlayIfNeeded = (payload: any) => {
      const nextPhase = payload?.phase ?? null;
      const nextIndex =
        payload?.currentIndex != null ? Number(payload.currentIndex) : null;
      const phaseChanged = nextPhase != null && nextPhase !== lastPhase;
      const indexChanged = nextIndex != null && nextIndex !== lastIndex;
      if (!phaseChanged && !indexChanged) return;
      lastPhase = nextPhase ?? lastPhase;
      lastIndex = nextIndex ?? lastIndex;
      apiClient
        .get(`/quiz-play/${numericRunId}/state`, { timeoutMs: 8000 })
        .then((playResult) => {
          if (playResult) setPlayState(playResult);
        })
        .catch(() => {});
    };

    const unsub = subscribeQuizRun(numericRunId, {
      onState: (payload) => {
        socketOk = true;
        setReconnecting(false);
        setState((prev: any) => ({
          ...(prev || {}),
          phase: payload.phase ?? prev?.phase,
          currentIndex: payload.currentIndex ?? prev?.currentIndex,
          phaseEndsAt: payload.phaseEndsAt ?? prev?.phaseEndsAt,
          eventId: payload.eventId ?? prev?.eventId,
        }));
        fetchPlayIfNeeded(payload);
      },
      onDisconnect: () => {
        socketOk = false;
        setReconnecting(true);
      },
      onReconnect: () => {
        socketOk = true;
        setReconnecting(false);
        refresh();
      },
      onPrizeDistributed: () => {
        setResultsReady(true);
        refreshProfile?.({ full: false }).catch(() => {});
      },
    });

    apiClient
      .get(`/quiz-play/${numericRunId}/participants`, { timeoutMs: 8000 })
      .then((p: any) => {
        participantsHint = Number(p?.participantsCount || 0);
      })
      .catch(() => {});

    fallbackTimer = setInterval(() => {
      if (!socketOk) refresh();
    }, 5000);

    // Re-check interval pacing for large runs via nested timer reset is overkill;
    // use 12s when hint already known high by delaying first poll adjust:
    const adjust = setTimeout(() => {
      if (fallbackTimer) clearInterval(fallbackTimer);
      const ms = participantsHint > 10000 ? 12000 : 5000;
      fallbackTimer = setInterval(() => {
        if (!socketOk) refresh();
      }, ms);
    }, 1500);

    return () => {
      unsub();
      clearTimeout(adjust);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [numericRunId, refresh, refreshProfile]);

  const phase = state?.phase || playState?.phase || 'PRE_START';
  const currentIndex = state?.currentIndex ?? playState?.currentQuestionIndex ?? 0;
  const question = playState?.question;
  const options = useMemo(() => officialOptions(question), [question]);
  const phaseEndsAt = state?.phaseEndsAt || playState?.phaseEndsAt;
  const secondsRemaining = useMemo(() => {
    if (!phaseEndsAt) return null;
    return Math.max(0, Math.ceil((new Date(phaseEndsAt).getTime() - now) / 1000));
  }, [phaseEndsAt, now]);

  const isLivePlay =
    !connectionLost &&
    phase !== 'FINISHED' &&
    playState?.participantStatus !== 'DISCONNECTED';

  useEffect(() => {
    // Tabs ocultas solo mientras se juega / animación de fin
    setHideTabBar(isLivePlay || (phase === 'FINISHED' && finishCeremony));
    return () => setHideTabBar(false);
  }, [isLivePlay, finishCeremony, phase, setHideTabBar]);

  const markDisconnected = useCallback(async () => {
    if (disconnectSent.current || phase === 'FINISHED') return;
    disconnectSent.current = true;
    setConnectionLost(true);
    setHideTabBar(false);
    try {
      await apiClient.post(`/quiz-play/${numericRunId}/disconnect`);
    } catch {
      /* ignore */
    }
  }, [numericRunId, phase, setHideTabBar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const clearKick = () => {
      if (offlineKickTimer.current) {
        clearTimeout(offlineKickTimer.current);
        offlineKickTimer.current = null;
      }
    };
    const onOffline = () => {
      if (phase === 'FINISHED') return;
      setReconnecting(true);
      clearKick();
      // Soft reconnect window — don't lock the screen immediately
      offlineKickTimer.current = setTimeout(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          markDisconnected();
        }
      }, 12000);
    };
    const onOnline = () => {
      clearKick();
      setReconnecting(false);
      if (phase !== 'FINISHED' && !disconnectSent.current) {
        refresh();
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      clearKick();
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, [phase, markDisconnected, refresh]);

  useEffect(() => {
    if (playState?.participantStatus === 'DISCONNECTED' && phase !== 'FINISHED') {
      setConnectionLost(true);
    }
  }, [playState?.participantStatus, phase]);

  useEffect(() => {
    if (phase !== 'FINISHED') {
      setFinishCeremony(false);
      return;
    }
    let cancelled = false;
    setFinishCeremony(true);
    const t = setTimeout(() => {
      if (!cancelled) setFinishCeremony(false);
    }, 2200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'FINISHED') return;
    refreshProfile?.({ full: false }).catch(() => {});
    let cancelled = false;
    (async () => {
      const dismissed = await secureStorage.getItem(dismissKey);
      if (!cancelled && dismissed === '1') {
        setHideTabBar(false);
        router.replace('/(app)');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, dismissKey, router, setHideTabBar, refreshProfile]);

  useEffect(() => {
    if (phase !== 'QUESTION_READ' || !question?.id) return;
    const key = `${question.id}-${currentIndex}`;
    if (introShownFor.current === key) return;
    introShownFor.current = key;
    setShowIntro(true);
    const t = setTimeout(() => setShowIntro(false), 750);
    return () => clearTimeout(t);
  }, [phase, question?.id, currentIndex]);

  useEffect(() => {
    if (phase === 'QUESTION_ANSWER') {
      setAnswerStartedAt(Date.now());
      setSelectedAnswer(null);
      setSubmitted(false);
      setLastResult(null);
      submittingRef.current = false;
      setSubmitting(false);
    } else if (phase === 'QUESTION_READ') {
      setSelectedAnswer(null);
      setSubmitted(false);
      setLastResult(null);
      setAnswerStartedAt(null);
      submittingRef.current = false;
      setSubmitting(false);
    } else if (phase !== 'QUESTION_CORRECTION') {
      setAnswerStartedAt(null);
    }
  }, [phase, question?.id]);

  useEffect(() => {
    if (phase !== 'QUESTION_RANKING' && phase !== 'FINISHED') return;
    let active = true;
    quizRunService.getRanking(numericRunId, { limit: 5 }).then((res) => {
      if (!active || !res.success) return;
      const top = res.data?.top || [];
      setRanking(Array.isArray(top) ? top.slice(0, 5) : []);
      setMyRank(res.data?.me || null);
    });
    return () => {
      active = false;
    };
  }, [phase, numericRunId]);

  useEffect(() => {
    if (phase !== 'FINISHED') return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setResultsReady(false);

    const delays = [900, 2000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000];

    const pull = async () => {
      attempts += 1;
      const res = await quizRunService.getResults(numericRunId, { limit: 10 });
      if (!active) return;
      if (!res.success) {
        const err = String(res.error || '').toLowerCase();
        const resultsGone =
          err.includes('disponibles') ||
          err.includes('available') ||
          err.includes('not found') ||
          Number(res.status) === 404 ||
          attempts >= delays.length;
        if (resultsGone) {
          setResultsReady(true);
        } else {
          timer = setTimeout(pull, delays[Math.min(attempts, delays.length - 1)]);
        }
        return;
      }
      setResults(res.data);
      if (res.data?.prizesReady || attempts >= delays.length) {
        setResultsReady(true);
        if (!congratsShown.current && (res.data?.myPrize || 0) > 0) {
          congratsShown.current = true;
          setShowCongrats(true);
        }
        return;
      }
      timer = setTimeout(pull, delays[Math.min(attempts, delays.length - 1)]);
    };

    pull();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, numericRunId]);

  // Si perdiste conexión, al acabar el quiz entras a premios
  useEffect(() => {
    if (!connectionLost) return;
    if (phase === 'FINISHED') {
      setConnectionLost(false);
      setFinishCeremony(false);
    }
  }, [connectionLost, phase]);

  const leavePrizes = useCallback(async () => {
    setShowExitConfirm(false);
    await secureStorage.setItem(dismissKey, '1');
    setHideTabBar(false);
    router.replace('/(app)');
  }, [dismissKey, router, setHideTabBar]);

  const confirmExitPrizes = () => setShowExitConfirm(true);

  const finalRanking = useMemo(() => {
    const list = results?.ranking;
    return Array.isArray(list) ? list : [];
  }, [results]);

  const myRankingEntry = useMemo(() => {
    if (myRank) {
      return {
        position: myRank.position,
        score: myRank.score ?? 0,
        lastGain: myRank.lastGain ?? 0,
        inTop: ranking.some((e: any) => (e.user?.id ?? e.userId) === myRank.userId),
      };
    }
    if (!user || ranking.length === 0) return null;
    const idx = ranking.findIndex((entry: any) => (entry.user?.id ?? entry.userId) === user.id);
    if (idx === -1) return null;
    return {
      position: idx + 1,
      score: ranking[idx].score ?? 0,
      lastGain: ranking[idx].lastGain ?? 0,
      inTop: true,
    };
  }, [ranking, user, myRank]);

  const myWinnerEntry = useMemo(() => {
    if (!user || !results?.winners) return null;
    return results.winners.find((w: any) => w.userId === user.id) || null;
  }, [results, user]);

  const myPrize = results?.myPrize ?? myWinnerEntry?.creditsWon ?? 0;

  const submitAnswerText = async (answerText: string) => {
    if (!question?.id || submittingRef.current || submitted || phase !== 'QUESTION_ANSWER') {
      return;
    }
    submittingRef.current = true;
    setSelectedAnswer(answerText);
    setSubmitting(true);
    setError(null);
    try {
      const responseTimeMs = answerStartedAt ? Math.max(0, Date.now() - answerStartedAt) : 0;
      const result = await apiClient.post(
        `/quiz-run/${numericRunId}/answer`,
        {
          questionId: question.id,
          answer: answerText,
          responseTimeMs,
        },
        { timeoutMs: 8000 }
      );
      if (result?.allowed === false) {
        setError(
          result?.reason
            ? String(result.reason)
            : t('quizPlay.answerError')
        );
        setSelectedAnswer(null);
        return;
      }
      setSubmitted(true);
      setLastResult({ isCorrect: result?.isCorrect, score: result?.score });
    } catch (err: any) {
      setError(err.message || t('quizPlay.answerError'));
      setSelectedAnswer(null);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const correctAnswerText = useMemo(() => {
    const hit = options.find((o: any) => o?.isCorrect);
    return hit ? String(hit.text || hit.label || '') : null;
  }, [options]);

  const phaseLabel =
    phase === 'PRE_START'
      ? t('quizPlay.phase.preStart')
      : phase === 'QUESTION_READ'
        ? t('quizPlay.phase.read')
        : phase === 'QUESTION_ANSWER'
          ? t('quizPlay.phase.answer')
          : phase === 'QUESTION_CORRECTION'
            ? t('quizPlay.phase.correction')
            : phase === 'QUESTION_RANKING'
              ? t('quizPlay.phase.ranking')
              : phase === 'FINISHED'
                ? t('quizPlay.phase.finished')
                : phase;

  if (loading && !state) {
    return (
      <View style={styles.shell}>
        <View style={[styles.phone, styles.centered]}>
          <View style={styles.skeletonBrand} />
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          <Text style={styles.loadingText}>{t('quizPlay.loadingEntry')}</Text>
        </View>
      </View>
    );
  }

  if (!state && error) {
    return (
      <View style={styles.shell}>
        <View style={[styles.phone, styles.centered, { paddingHorizontal: Spacing.four }]}>
          <Text style={[styles.heroTitle, styles.badText]}>{t('common.error')}</Text>
          <Text style={styles.heroSub}>{error}</Text>
          <Text style={styles.softHint}>{t('quizPlay.loadErrorHint')}</Text>
          <Pressable style={styles.exitBtn} onPress={() => refresh()}>
            <Text style={styles.exitBtnText}>{t('common.retry')}</Text>
          </Pressable>
          <Pressable
            style={[styles.exitBtn, { marginTop: Spacing.two }]}
            onPress={() => {
              setHideTabBar(false);
              router.back();
            }}
          >
            <Text style={styles.exitBtnText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={[styles.phone, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        <LinearGradient
          colors={[...APP_GRADIENT_SOFT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <LinearGradient {...brandGradientProps} style={[styles.topBand, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.brandMark}>{t('common.appName')}</Text>
          <View style={styles.topMeta}>
            <Text style={styles.topMetaText}>{phaseLabel}</Text>
            <Text style={styles.topMetaDot}>·</Text>
            <Text style={styles.topMetaText}>{t('quizPlay.questionLabel', { n: Number(currentIndex) + 1 })}</Text>
          </View>
        </LinearGradient>

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {reconnecting && !connectionLost && phase !== 'FINISHED' ? (
          <View style={styles.reconnectBanner}>
            <Text style={styles.reconnectTitle}>{t('quizPlay.reconnecting')}</Text>
            <Text style={styles.reconnectHint}>{t('quizPlay.reconnectingHint')}</Text>
          </View>
        ) : null}

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          {connectionLost && phase !== 'FINISHED' ? (
            <Animated.View entering={FadeIn} style={styles.centerBlock}>
              <Text style={[styles.heroTitle, styles.badText]}>{t('quizPlay.connectionLostTitle')}</Text>
              <Text style={styles.heroSub}>
                {t('quizPlay.connectionLostBody1')}
              </Text>
              <Text style={styles.heroSub}>
                {t('quizPlay.connectionLostBody2')}
              </Text>
              <Text style={styles.softHint}>{t('quizPlay.waitingForEnd')}</Text>
              <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.two }} />
              <Pressable
                style={styles.exitBtn}
                onPress={() => {
                  setHideTabBar(false);
                  router.replace('/(app)');
                }}
              >
                <Text style={styles.exitBtnText}>{t('quizPlay.backToHome')}</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* PRE_START: entrada cerrada — Ya casi + cuenta atrás hasta el inicio */}
          {!connectionLost && phase === 'PRE_START' ? (
            <Animated.View entering={FadeIn} style={styles.centerBlock}>
              <BreathDot />
              <Text style={styles.heroTitle}>{t('quizPlay.almostThere')}</Text>
              <Text style={styles.heroSub}>{t('quizPlay.keepAppOpen')}</Text>
              {secondsRemaining != null ? (
                <Text style={styles.lobbyCountdown}>
                  {t('quizPlay.lobbyCountdown', {
                    time: formatLobbyCountdown(secondsRemaining),
                  })}
                </Text>
              ) : null}
              <Pressable
                style={[styles.exitBtn, { marginTop: Spacing.three }]}
                onPress={() => {
                  setHideTabBar(false);
                  router.replace('/(app)');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.exitBtnText}>{t('quizPlay.leaveCountdown')}</Text>
              </Pressable>
            </Animated.View>
          ) : null}

          {/* Intro corta entre preguntas */}
          {showIntro && !connectionLost && phase === 'QUESTION_READ' ? (
            <Animated.View entering={FadeIn.duration(240).easing(Easing.out(Easing.cubic))} style={styles.centerBlock}>
              <LinearGradient {...brandGradientProps} style={styles.introChip}>
                <Text style={styles.introChipText}>{t('quizPlay.questionLabel', { n: Number(currentIndex) + 1 })}</Text>
              </LinearGradient>
            </Animated.View>
          ) : null}

          {/* QUESTION_READ */}
          {phase === 'QUESTION_READ' && question && !showIntro && !connectionLost ? (
            <Animated.View entering={FadeInUp.duration(320)} style={styles.readBlock}>
              {question.imageUrl ? (
                <Image source={{ uri: question.imageUrl }} style={styles.questionImage} resizeMode="cover" />
              ) : null}
              <Text style={styles.questionBig}>{question.text}</Text>
              <Text style={styles.softHint}>{t('quizPlay.readCarefully')}</Text>
            </Animated.View>
          ) : null}

          {/* QUESTION_ANSWER — countdown numérico solamente */}
          {phase === 'QUESTION_ANSWER' && question && !connectionLost ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.answerBlock}>
              <AnswerTimer secondsRemaining={secondsRemaining} />

              <Text style={styles.questionSmall} numberOfLines={4}>
                {question.text}
              </Text>
              {question.imageUrl ? (
                <Image
                  source={{ uri: question.imageUrl }}
                  style={styles.questionImageSmall}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.optionsList}>
                {options.map((option: any, index: number) => {
                  const label = typeof option === 'string' ? option : option.text || option.label;
                  const accent = OPTION_ACCENTS[index % OPTION_ACCENTS.length];
                  const active = selectedAnswer === label;
                  const locked = submitted || submitting;
                  return (
                    <Animated.View
                      key={`${question.id}-${label}-${index}`}
                      entering={FadeInDown.delay(60 * index).duration(280)}
                    >
                      <Pressable
                        onPress={() => submitAnswerText(String(label))}
                        disabled={locked}
                        style={({ pressed }) => [
                          styles.optionRow,
                          { borderLeftColor: accent },
                          active && styles.optionRowActive,
                          locked && !active && styles.optionRowDim,
                          pressed && !locked && styles.optionPressed,
                        ]}
                      >
                        <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
                        <Text style={styles.optionText}>{label}</Text>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {phase === 'QUESTION_CORRECTION' && question && !connectionLost ? (
            <Animated.View entering={FadeIn} style={styles.correctionBlock}>
              <Text
                style={[
                  styles.correctionTitle,
                  lastResult?.isCorrect
                    ? styles.okText
                    : lastResult?.isCorrect === false
                      ? styles.badText
                      : null,
                ]}
              >
                {lastResult?.isCorrect
                  ? t('quizPlay.correct')
                  : lastResult?.isCorrect === false
                    ? t('quizPlay.incorrect')
                    : t('quizPlay.revealing')}
              </Text>

              <View style={styles.optionsList}>
                {options.map((option: any, index: number) => {
                  const label = typeof option === 'string' ? option : option.text || option.label;
                  const isCorrectOpt = Boolean(option?.isCorrect) || label === correctAnswerText;
                  const isMineWrong =
                    Boolean(selectedAnswer) &&
                    selectedAnswer === label &&
                    lastResult?.isCorrect === false;
                  return (
                    <Animated.View
                      key={`corr-${question.id}-${label}-${index}`}
                      entering={FadeInDown.delay(40 * index).duration(240)}
                    >
                      <View
                        style={[
                          styles.optionRow,
                          styles.optionRowStatic,
                          isCorrectOpt && styles.optionRowCorrect,
                          isMineWrong && styles.optionRowWrong,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionLetter,
                            isCorrectOpt && styles.optionLetterCorrect,
                            isMineWrong && styles.optionLetterWrong,
                          ]}
                        >
                          {String.fromCharCode(65 + index)}
                        </Text>
                        <Text style={styles.optionText}>{label}</Text>
                        {isCorrectOpt ? (
                          <Text style={styles.optionMarkOk}>✓</Text>
                        ) : isMineWrong ? (
                          <Text style={styles.optionMarkBad}>✗</Text>
                        ) : null}
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {phase === 'QUESTION_RANKING' && !connectionLost ? (
            <Animated.View entering={FadeInUp} style={styles.rankBlock}>
              <Text style={styles.heroTitle}>{t('quizPlay.rankingTitle')}</Text>
              <Text style={styles.softHint}>{t('quizPlay.pointsAccumulated')}</Text>
              {myRankingEntry ? (
                <Text style={styles.myPos}>
                  {t('quizPlay.myPosition', { position: myRankingEntry.position, score: myRankingEntry.score })}
                </Text>
              ) : null}
              {ranking.length === 0 ? (
                <ActivityIndicator color={Colors.light.primary} />
              ) : (
                <>
                  {ranking.map((entry: any, index: number) => {
                    const uid = entry.user?.id ?? entry.userId;
                    const isMe = user && uid === user.id;
                    return (
                      <Animated.View
                        key={uid ?? index}
                        entering={FadeInDown.delay(50 * index).duration(280)}
                        style={[styles.rankRow, isMe && styles.rankRowMe]}
                      >
                        <Text style={styles.rankPos}>{entry.position ?? index + 1}</Text>
                        <Text style={styles.rankName} numberOfLines={1}>
                          {entry.user?.username || t('quizPlay.playerFallback', { id: uid ?? index + 1 })}
                        </Text>
                        <RankGainBadge gain={entry.lastGain ?? 0} />
                        <Text style={styles.rankScore}>{entry.score ?? 0}</Text>
                      </Animated.View>
                    );
                  })}
                  {myRankingEntry && !myRankingEntry.inTop && myRank ? (
                    <>
                      <Text style={styles.rankEllipsis}>···</Text>
                      <Animated.View
                        entering={FadeInDown.delay(280).duration(280)}
                        style={[styles.rankRow, styles.rankRowMe]}
                      >
                        <Text style={styles.rankPos}>{myRank.position}</Text>
                        <Text style={styles.rankName} numberOfLines={1}>
                          {myRank.user?.username || t('quizPlay.you')}
                        </Text>
                        <RankGainBadge gain={myRank.lastGain ?? 0} />
                        <Text style={styles.rankScore}>{myRank.score ?? 0}</Text>
                      </Animated.View>
                    </>
                  ) : null}
                </>
              )}
            </Animated.View>
          ) : null}

          {phase === 'FINISHED' && finishCeremony ? (
            <Animated.View entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))} style={styles.centerBlock}>
              <LinearGradient {...brandGradientProps} style={styles.finishBurst} />
              <Text style={styles.finishBurstTitle}>{t('quizPlay.finishedTitle')}</Text>
              <Text style={styles.heroSub}>{t('quizPlay.quizEnded')}</Text>
            </Animated.View>
          ) : null}

          {phase === 'FINISHED' && !finishCeremony ? (
            !resultsReady ? (
              <Animated.View entering={FadeIn} style={styles.centerBlock}>
                <BreathDot />
                <Text style={styles.heroTitle}>{t('quizPlay.oneSecond')}</Text>
                <Text style={styles.heroSub}>{t('quizPlay.countingPoints')}</Text>
                <ActivityIndicator color={Colors.light.primary} style={{ marginTop: Spacing.two }} />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp} style={styles.prizeStage}>
                <Text style={styles.prizeEyebrow}>{t('quizPlay.resultsLabel')}</Text>
                <Text style={styles.prizeHero}>
                  {(results?.me?.position || myRankingEntry?.position)
                    ? t('quizPlay.finishedPosition', { position: results?.me?.position ?? myRankingEntry?.position })
                    : t('quizPlay.matchEnded')}
                </Text>
                {(results?.me?.score ?? myRankingEntry?.score) != null ? (
                  <Text style={styles.prizeScoreLine}>
                    {myPrize > 0
                      ? t('quizPlay.scoreLineWithPrize', {
                          score: results?.me?.score ?? myRankingEntry?.score,
                          prize: myPrize,
                        })
                      : t('quizPlay.scoreLine', { score: results?.me?.score ?? myRankingEntry?.score })}
                  </Text>
                ) : null}
                {results?.resultsExpiresAt ? (
                  <Text style={styles.prizeExpiry}>
                    {t('quizPlay.resultsExpiry')}
                  </Text>
                ) : null}

                <View style={styles.prizeList}>
                  {finalRanking.length === 0 ? (
                    <Text style={styles.heroSub}>{t('quizPlay.noRankingYet')}</Text>
                  ) : (
                    finalRanking.slice(0, 10).map((entry: any, index: number) => {
                      const uid = entry.user?.id ?? entry.userId;
                      const isMe = user && uid === user.id;
                      const prize = entry.creditsWon || 0;
                      return (
                        <Animated.View
                          key={uid ?? index}
                          entering={FadeInDown.delay(50 * index).duration(260)}
                          style={[styles.prizeRowLive, isMe && styles.prizeRowMe]}
                        >
                          <Text style={styles.prizePos}>#{entry.position ?? index + 1}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prizeName} numberOfLines={1}>
                              {isMe ? t('quizPlay.you') : entry.user?.username || t('quizPlay.playerFallback', { id: uid })}
                            </Text>
                            <Text style={styles.prizePts}>{t('quizPlay.scoreLine', { score: entry.score ?? 0 })}</Text>
                          </View>
                          <Text style={prize > 0 ? styles.prizeCredits : styles.prizeCreditsMuted}>
                            {prize > 0
                              ? t('quizPlay.creditsPrize', { n: prize })
                              : t('quizPlay.noCreditsPrize')}
                          </Text>
                        </Animated.View>
                      );
                    })
                  )}
                </View>

                <Pressable style={styles.exitBtn} onPress={confirmExitPrizes}>
                  <Text style={styles.exitBtnText}>{t('quizPlay.backToHome')}</Text>
                </Pressable>
              </Animated.View>
            )
          ) : null}
        </ScrollView>

        <Modal visible={showCongrats} transparent animationType="fade" onRequestClose={() => setShowCongrats(false)}>
          <MobileModalFrame justify="center" onBackdropPress={() => setShowCongrats(false)}>
            <Animated.View entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))} style={styles.congratsCard}>
              <LinearGradient {...brandGradientProps} style={styles.congratsGlow} />
              <Text style={styles.congratsTitle}>{t('quizPlay.congratsTitle')}</Text>
              <Text style={styles.congratsBody}>{t('quizPlay.congratsBody')}</Text>
              <Text style={styles.congratsAmount}>{t('quizPlay.congratsAmount', { n: myPrize })}</Text>
              <Text style={styles.congratsSub}>{t('quizPlay.congratsSub')}</Text>
              <Pressable style={styles.congratsBtn} onPress={() => setShowCongrats(false)}>
                <Text style={styles.congratsBtnText}>{t('quizPlay.congratsButton')}</Text>
              </Pressable>
            </Animated.View>
          </MobileModalFrame>
        </Modal>

        <Modal
          visible={showExitConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExitConfirm(false)}
        >
          <MobileModalFrame justify="center" onBackdropPress={() => setShowExitConfirm(false)}>
            <View style={styles.exitConfirmCard} accessibilityRole="dialog">
              <LinearGradient {...brandGradientProps} style={styles.congratsGlow} />
              <Text style={styles.exitConfirmKicker}>{t('quizPlay.exitConfirmKicker')}</Text>
              <Text style={styles.exitConfirmTitle}>{t('quizPlay.exitConfirmTitle')}</Text>
              <Text style={styles.exitConfirmBody}>
                {t('quizPlay.exitConfirmBody')}
              </Text>
              <View style={styles.exitConfirmActions}>
                <Pressable
                  style={({ pressed }) => [styles.exitConfirmCancel, pressed && { opacity: 0.85 }]}
                  onPress={() => setShowExitConfirm(false)}
                >
                  <Text style={styles.exitConfirmCancelText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.exitConfirmOk, pressed && { opacity: 0.9 }]}
                  onPress={leavePrizes}
                >
                  <Text style={styles.exitConfirmOkText}>{t('quizPlay.exitConfirmOk')}</Text>
                </Pressable>
              </View>
            </View>
          </MobileModalFrame>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#E7E5E4',
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
  },
  centered: { justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  skeletonBrand: {
    width: 88,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(217,119,6,0.28)',
    marginBottom: Spacing.three,
  },
  skeletonLine: {
    width: '62%',
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(28,25,23,0.08)',
    marginBottom: Spacing.two,
  },
  skeletonLineShort: { width: '42%' },
  reconnectBanner: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(217,119,6,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.35)',
  },
  reconnectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.light.text,
  },
  reconnectHint: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  loadingText: {
    marginTop: Spacing.three,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  topBand: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  brandMark: {
    ...titleTypeface,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  topMetaText: { color: 'rgba(255,255,255,0.92)', fontWeight: '600', fontSize: 13 },
  topMetaDot: { color: 'rgba(255,255,255,0.6)' },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    flexGrow: 1,
  },
  errorBanner: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: Spacing.two,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.12)',
    color: Colors.light.error,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerBlock: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  breathOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    backgroundColor: 'rgba(59,130,246,0.15)',
    marginBottom: Spacing.two,
  },
  breathInner: { flex: 1, borderRadius: 36 },
  heroTitle: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  lobbyCountdown: {
    ...titleTypeface,
    marginTop: Spacing.three,
    fontSize: 36,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  introChip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 999,
  },
  introChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  readBlock: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  questionImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSelected,
  },
  questionImageSmall: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSelected,
    marginBottom: Spacing.two,
  },
  questionBig: {
    ...titleTypeface,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 32,
  },
  questionSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.two,
  },
  softHint: {
    marginTop: Spacing.three,
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  startBurstWrap: { alignItems: 'center', gap: Spacing.two },
  startBurstNum: {
    ...titleTypeface,
    fontSize: 88,
    fontWeight: '800',
    color: Colors.light.primary,
    lineHeight: 96,
  },
  startBurstDone: { alignItems: 'center' },
  answerBlock: { gap: Spacing.two },
  answerTimerWrap: {
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  answerTimerNum: {
    ...titleTypeface,
    fontSize: 40,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  optionsList: { gap: Spacing.two, marginTop: Spacing.two },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    borderLeftWidth: 5,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 56,
  },
  optionRowStatic: {
    borderLeftColor: Colors.light.backgroundSelected,
  },
  optionRowActive: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  optionRowCorrect: {
    borderColor: Colors.light.success,
    borderLeftColor: Colors.light.success,
    backgroundColor: '#F0FDF4',
  },
  optionRowWrong: {
    borderColor: Colors.light.error,
    borderLeftColor: Colors.light.error,
    backgroundColor: '#FEF2F2',
  },
  optionRowDim: { opacity: 0.45 },
  optionPressed: { opacity: 0.88 },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSelected,
    color: Colors.light.text,
    fontWeight: '800',
    fontSize: 13,
  },
  optionLetterCorrect: {
    backgroundColor: Colors.light.success,
    color: '#FFFFFF',
  },
  optionLetterWrong: {
    backgroundColor: Colors.light.error,
    color: '#FFFFFF',
  },
  optionText: {
    flex: 1,
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
  },
  optionMarkOk: {
    fontWeight: '800',
    fontSize: 18,
    color: Colors.light.success,
  },
  optionMarkBad: {
    fontWeight: '800',
    fontSize: 18,
    color: Colors.light.error,
  },
  correctionBlock: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  correctionTitle: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  okText: { color: Colors.light.success },
  badText: { color: Colors.light.error },
  rankBlock: { gap: Spacing.two },
  myPos: {
    textAlign: 'center',
    color: Colors.light.primary,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.backgroundSelected,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  rankRowMe: {
    borderColor: Colors.light.primary,
    backgroundColor: '#EFF6FF',
  },
  rankPos: {
    width: 28,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  rankName: { flex: 1, fontWeight: '700', color: Colors.light.text },
  rankGain: {
    fontWeight: '800',
    color: Colors.light.success,
    fontSize: 13,
    marginRight: 4,
  },
  rankScore: { fontWeight: '800', color: Colors.light.textSecondary, minWidth: 44, textAlign: 'right' },
  rankPrize: {
    fontWeight: '800',
    color: Colors.light.success,
    minWidth: 52,
    textAlign: 'right',
    fontSize: 13,
  },
  rankPrizeMuted: {
    minWidth: 52,
    textAlign: 'right',
    color: Colors.light.textSecondary,
    opacity: 0.45,
    fontWeight: '700',
  },
  rankEllipsis: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: 2,
  },
  finishHeader: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  finishBand: {
    width: 64,
    height: 6,
    borderRadius: 999,
    marginBottom: Spacing.two,
  },
  finishStat: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  finishWin: {
    marginTop: Spacing.two,
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  congratsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  congratsCard: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    alignSelf: 'center',
    marginHorizontal: Spacing.three,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    overflow: 'hidden',
    gap: Spacing.two,
    zIndex: 2,
  },
  congratsGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  congratsTitle: {
    ...titleTypeface,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.light.text,
  },
  congratsBody: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  congratsAmount: {
    ...titleTypeface,
    fontSize: 36,
    fontWeight: '800',
    color: Colors.light.primary,
    marginVertical: Spacing.one,
  },
  congratsSub: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.two,
  },
  congratsBtn: {
    marginTop: Spacing.two,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
    minWidth: 160,
    alignItems: 'center',
  },
  congratsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  finishBurst: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: Spacing.three,
  },
  finishBurstTitle: {
    ...titleTypeface,
    fontSize: 56,
    fontWeight: '800',
    color: Colors.light.text,
  },
  prizeStage: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  prizeEyebrow: {
    textAlign: 'center',
    fontWeight: '700',
    color: Colors.light.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  prizeHero: {
    ...titleTypeface,
    fontSize: 30,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  prizeScoreLine: {
    textAlign: 'center',
    fontWeight: '700',
    color: Colors.light.primary,
    fontSize: 16,
  },
  prizeExpiry: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 12,
    marginBottom: Spacing.two,
  },
  prizeList: { gap: Spacing.two, marginTop: Spacing.two },
  prizeRowLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSelected,
  },
  prizeRowMe: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  prizePos: {
    width: 36,
    fontWeight: '800',
    color: Colors.light.primary,
    fontSize: 15,
  },
  prizeName: {
    fontWeight: '800',
    color: Colors.light.text,
    fontSize: 15,
  },
  prizePts: {
    color: Colors.light.textSecondary,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 2,
  },
  prizeCredits: {
    fontWeight: '800',
    color: Colors.light.success,
    fontSize: 16,
    minWidth: 48,
    textAlign: 'right',
  },
  prizeCreditsMuted: {
    fontWeight: '700',
    color: Colors.light.textSecondary,
    opacity: 0.4,
    minWidth: 48,
    textAlign: 'right',
  },
  exitBtn: {
    marginTop: Spacing.five,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.10)',
  },
  exitBtnText: {
    fontWeight: '700',
    color: Colors.light.primary,
    fontSize: 15,
  },
  exitConfirmCard: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    alignSelf: 'center',
    marginHorizontal: Spacing.three,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    overflow: 'hidden',
    gap: Spacing.two,
    zIndex: 2,
  },
  exitConfirmKicker: {
    marginTop: Spacing.two,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  exitConfirmTitle: {
    ...titleTypeface,
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.text,
  },
  exitConfirmBody: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  exitConfirmActions: {
    flexDirection: 'column',
    gap: Spacing.two,
    marginTop: Spacing.two,
    width: '100%',
  },
  exitConfirmCancel: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSelected,
  },
  exitConfirmCancelText: {
    fontWeight: '700',
    color: Colors.light.textSecondary,
    fontSize: 15,
  },
  exitConfirmOk: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
  },
  exitConfirmOkText: {
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
