import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import apiClient from '@/lib/api';
import { quizRunService } from '@/services/quizRunService';

/** Auto-enter countdown for enrolled quizzes at T−30s, wherever the user is. */
const AUTO_ENTER_MS = 30_000;
const LOBBY_WINDOW_MS = 60_000;
const POLL_MS = 4_000;

export default function EnrolledQuizGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, token } = useAuth() as any;
  const enteringRef = useRef(false);

  const tick = useCallback(async () => {
    if (!isAuthenticated || enteringRef.current) return;
    try {
      if (token) apiClient.setToken(token);
      const res = await apiClient.get('/home');
      const data = res?.data || res;
      const items = data?.myUpcomingEnrollments || [];
      const now = Date.now();

      for (const item of items) {
        const startsAt = item?.startsAt ? new Date(item.startsAt).getTime() : null;
        if (startsAt == null || Number.isNaN(startsAt)) continue;
        const msUntil = startsAt - now;
        // Only act in the last minute (lobby window) through a short grace after start
        if (msUntil > LOBBY_WINDOW_MS || msUntil < -45_000) continue;

        let runId = item.activeRunId ? Number(item.activeRunId) : null;
        if (!runId && msUntil <= LOBBY_WINDOW_MS) {
          try {
            const ensured = await apiClient.post(`/quiz-play/ensure-run/${item.quizId}`);
            runId = ensured?.run?.id ? Number(ensured.run.id) : null;
          } catch {
            /* lobby may not be open yet */
          }
        }
        if (!runId) continue;

        const onThisRun =
          typeof pathname === 'string' &&
          (pathname.includes(`/quiz/run/${runId}`) ||
            pathname.endsWith(`/run/${runId}`));
        if (onThisRun) continue;

        // Auto-enter at T−30s (and keep pulling back until questions if they left)
        if (msUntil > AUTO_ENTER_MS) continue;

        enteringRef.current = true;
        try {
          await quizRunService.joinQuiz(runId);
        } catch {
          /* already joined is fine */
        }
        router.push(`/(app)/quiz/run/${runId}`);
        enteringRef.current = false;
        return;
      }
    } catch {
      /* ignore transient home errors */
    }
  }, [isAuthenticated, token, pathname, router]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    void tick();
    const id = setInterval(() => {
      void tick();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, tick]);

  return null;
}
