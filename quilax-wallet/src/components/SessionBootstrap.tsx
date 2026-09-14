/**
 * Si la app Quilax abre Gestión con ?token=… / /sso?token=…, guardamos la sesión.
 * Sin SSO desde la app: pantalla login (salvo recuperación de saldo).
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useRouter, usePathname, useLocalSearchParams } from 'expo-router';
import { saveToken, getToken, clearToken } from '@/lib/api';

const TOKEN_KEY = 'quilax_session_token';
export const APP_SESSION_KEY = 'quilax_wallet_app_session';
export const RECOVERY_SESSION_KEY = 'quilax_wallet_recovery_session';

function readTokenFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    let token = params.get('token')?.trim() || null;
    if (!token && window.location.hash) {
      const raw = window.location.hash.replace(/^#/, '');
      if (raw.startsWith('token=')) {
        const value = raw.slice('token='.length).split(/[?&]/)[0];
        token = decodeURIComponent(value.trim()) || null;
      } else {
        const hp = new URLSearchParams(raw.includes('=') ? raw.replace(/^\?/, '') : '');
        token = hp.get('token')?.trim() || null;
      }
    }
    return token;
  } catch {
    return null;
  }
}

function stripTokenFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    if (url.hash && url.hash.includes('token=')) {
      url.hash = '';
    }
    const path = url.pathname === '/sso' ? '/' : url.pathname;
    const clean = `${path}${url.search}${url.hash}`;
    window.history.replaceState({}, '', clean || '/');
  } catch {
    /* ignore */
  }
}

function markAppSession() {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(APP_SESSION_KEY, '1');
      sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(APP_SESSION_KEY, '1');
      localStorage.removeItem(RECOVERY_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function markRecoverySession() {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(RECOVERY_SESSION_KEY, '1');
      sessionStorage.removeItem(APP_SESSION_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(RECOVERY_SESSION_KEY, '1');
      localStorage.removeItem(APP_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function hasAppSessionFlag(): boolean {
  if (Platform.OS !== 'web') return true;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(APP_SESSION_KEY) === '1') {
      return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(APP_SESSION_KEY) === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function hasRecoverySessionFlag(): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(RECOVERY_SESSION_KEY) === '1') {
      return true;
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(RECOVERY_SESSION_KEY) === '1') {
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function hasValidWalletSessionFlag(): boolean {
  if (Platform.OS !== 'web') return true;
  return hasAppSessionFlag() || hasRecoverySessionFlag();
}

function clearAppSessionFlag() {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(APP_SESSION_KEY);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(APP_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function clearRecoverySessionFlag() {
  if (Platform.OS !== 'web') return;
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(RECOVERY_SESSION_KEY);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(RECOVERY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Aplica token de URL (o ya capturado por sso-boot) a storage. */
function applyUrlTokenSync(paramToken?: string | null): boolean {
  const urlToken = (paramToken && String(paramToken).trim()) || readTokenFromUrl();
  if (!urlToken) {
    // Boot script may have stored token already while URL still has it or was cleaned
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) {
      markAppSession();
      stripTokenFromUrl();
      return true;
    }
    return false;
  }
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, urlToken);
    markAppSession();
    stripTokenFromUrl();
    return true;
  }
  return false;
}

/**
 * Solo limpia sesión residual en visitas directas sin SSO.
 * Retrasado para no pelear con Strict Mode / hidratación.
 */
function enforceAppOnlyEntrySync() {
  if (Platform.OS !== 'web') return;
  if (readTokenFromUrl()) return;
  if (hasValidWalletSessionFlag()) return;
  // Token in localStorage = valid app session (e.g. Stripe return wiped sessionStorage).
  if (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) {
    markAppSession();
    return;
  }
  clearAppSessionFlag();
  clearRecoverySessionFlag();
}

const PUBLIC_PATHS = ['/login', '/legal', '/sso'];

function isPublicPath(path: string | null) {
  if (!path) return false;
  return PUBLIC_PATHS.some((p) => path === p || path.endsWith(p));
}

function paramTokenValue(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && String(v).trim() ? String(v).trim() : null;
}

export function SessionBootstrap({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const applied = useRef(false);
  const fromParams = paramTokenValue(params.token);

  if (Platform.OS === 'web') {
    if (!applied.current && applyUrlTokenSync(fromParams)) {
      applied.current = true;
    }
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const urlToken = fromParams || readTokenFromUrl();
      if (urlToken) {
        await saveToken(urlToken);
        markAppSession();
        stripTokenFromUrl();
        applied.current = true;
        if (!cancelled && (pathname === '/sso' || pathname?.endsWith('/sso') || pathname === '/login')) {
          router.replace('/');
        } else if (!cancelled && pathname !== '/') {
          // stay on deep link (e.g. /bank) after SSO
        } else if (!cancelled && (pathname === '/login' || pathname?.endsWith('/login'))) {
          router.replace('/');
        }
        return;
      }

      if (applied.current || hasValidWalletSessionFlag()) {
        const existing = await getToken();
        if (existing && (pathname === '/login' || pathname?.endsWith('/login') || pathname === '/sso')) {
          if (hasAppSessionFlag()) router.replace('/');
          else if (hasRecoverySessionFlag()) router.replace('/recover-balance');
        }
        return;
      }

      // Esperar un poco: boot script / Strict Mode
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled) return;

      if (applyUrlTokenSync(fromParams) || hasValidWalletSessionFlag()) {
        applied.current = true;
        const existing = await getToken();
        if (existing && (pathname === '/login' || pathname === '/sso')) {
          router.replace('/');
        }
        return;
      }

      enforceAppOnlyEntrySync();
      if (Platform.OS === 'web' && !hasValidWalletSessionFlag()) {
        await clearToken();
        if (!isPublicPath(pathname)) {
          router.replace('/login');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, fromParams]);

  return <>{children}</>;
}
