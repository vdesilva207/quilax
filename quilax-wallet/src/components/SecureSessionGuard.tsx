/**
 * Secure session for Gestión web:
 * - Logout on tab/app blur / visibility hidden
 * - Short idle timeout without interaction
 * - Touch/key activity resets the idle clock
 */

import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { clearToken, getToken, logoutSession } from '@/lib/api';
import { hasValidWalletSessionFlag } from '@/components/SessionBootstrap';

/** Idle without interaction → force re-login (ms). */
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * After leaving the tab/app, logout.
 * Long enough for Google Authenticator during 2FA setup (QR + code).
 */
export const BLUR_LOGOUT_MS = 45 * 1000;
/** Grace while actively setting up or entering TOTP for money ops. */
export const BLUR_LOGOUT_2FA_MS = 10 * 60 * 1000;

const PUBLIC_PATHS = ['/login', '/legal', '/sso'];
const TOTP_GRACE_PATHS = ['/security/2fa', '/deposit', '/withdraw'];

function isPublicPath(path: string | null) {
  if (!path) return false;
  return PUBLIC_PATHS.some((p) => path === p || path.endsWith(p));
}

function isTotpGracePath(path: string | null) {
  if (!path) return false;
  return TOTP_GRACE_PATHS.some((p) => path === p || path.endsWith(p));
}

export function SecureSessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locking = useRef(false);

  const forceLogout = useCallback(
    async (reason: string) => {
      if (locking.current) return;
      if (isPublicPath(pathname)) return;
      // Never kick mid-2FA setup / TOTP entry (user is in Authenticator app).
      if (reason === 'blur' && isTotpGracePath(pathname)) return;
      locking.current = true;
      try {
        await logoutSession().catch(() => clearToken());
        router.replace('/login');
        if (typeof console !== 'undefined') {
          console.info('[secure-session]', reason);
        }
      } finally {
        setTimeout(() => {
          locking.current = false;
        }, 500);
      }
    },
    [pathname, router]
  );

  const resetIdle = useCallback(() => {
    if (isPublicPath(pathname)) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      forceLogout('idle');
    }, IDLE_TIMEOUT_MS);
  }, [forceLogout, pathname]);

  // Require auth on protected routes (and app SSO / recovery session on web)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        if (isPublicPath(pathname)) return;
        // Token still in URL → SessionBootstrap is applying SSO; don't bounce yet
        if (
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          (window.location.search.includes('token=') ||
            window.location.hash.includes('token='))
        ) {
          return;
        }
        const token = await getToken();
        const sessionOk = Platform.OS !== 'web' || hasValidWalletSessionFlag();
        if (!cancelled && (!token || !sessionOk)) {
          if (!sessionOk) await clearToken();
          router.replace('/login');
        }
      })();
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, router]);

  // Idle + activity listeners
  useEffect(() => {
    if (isPublicPath(pathname)) return;
    // Don't idle-logout during 2FA setup (user may be reading the key / in Authenticator).
    if (pathname?.includes('/security/2fa')) return;

    resetIdle();

    const onActivity = () => resetIdle();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      events.forEach((e) => document.addEventListener(e, onActivity, { passive: true }));
    }

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        events.forEach((e) => document.removeEventListener(e, onActivity));
      }
    };
  }, [pathname, resetIdle]);

  // Leave tab / background → logout after short grace (longer on 2FA screens)
  useEffect(() => {
    if (isPublicPath(pathname)) return;
    // Fully pause blur logout on 2FA setup screen.
    if (pathname?.includes('/security/2fa')) {
      return () => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
      };
    }

    const grace = isTotpGracePath(pathname) ? BLUR_LOGOUT_2FA_MS : BLUR_LOGOUT_MS;

    const onHidden = () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        forceLogout('blur');
      }, grace);
    };

    const onVisible = () => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
        blurTimer.current = null;
      }
      resetIdle();
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVis = () => {
        if (document.visibilityState === 'hidden') onHidden();
        else onVisible();
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        document.removeEventListener('visibilitychange', onVis);
        if (blurTimer.current) clearTimeout(blurTimer.current);
      };
    }

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') onHidden();
      else if (next === 'active') onVisible();
    });
    return () => {
      sub.remove();
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, [forceLogout, pathname, resetIdle]);

  return <>{children}</>;
}
