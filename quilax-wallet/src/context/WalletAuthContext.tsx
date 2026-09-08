import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, API_BASE_URL } from '../lib/api';
import { captureTokenFromLocation, stripTokenFromUrl } from '../lib/authTokenFromUrl';
import { clearToken, getToken, saveToken } from '../lib/secureStorage';

type WalletStatus = {
  balance: number;
  currency: string;
  user?: { email?: string; fullName?: string; username?: string };
  verification?: {
    isOver18?: boolean;
    isBankVerified?: boolean;
    idVerified?: boolean;
    hasBankAccount?: boolean;
    hasConnectAccount?: boolean;
  };
  eligibility?: { canDeposit?: boolean; canWithdraw?: boolean; reasons?: string[] };
};

type WalletAuthContextValue = {
  ready: boolean;
  authenticated: boolean;
  authError: string | null;
  status: WalletStatus | null;
  refreshStatus: () => Promise<void>;
  signOut: () => Promise<void>;
};

const WalletAuthContext = createContext<WalletAuthContextValue | null>(null);

async function verifySession() {
  await apiFetch('/wallet-access/verify-session', { method: 'POST' });
}

async function loadStatus(): Promise<WalletStatus> {
  const data = await apiFetch('/wallet-access/status');
  return {
    balance: data.balance,
    currency: data.currency,
    user: data.user,
    verification: data.verification,
    eligibility: data.eligibility,
  };
}

export function WalletAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    const next = await loadStatus();
    setStatus(next);
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    setAuthenticated(false);
    setStatus(null);
    setAuthError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const urlToken = captureTokenFromLocation();
        if (urlToken) {
          await saveToken(urlToken);
          stripTokenFromUrl();
        }

        const stored = urlToken || (await getToken());
        if (!stored) {
          if (!cancelled) {
            setAuthenticated(false);
            setStatus(null);
            setAuthError(null);
          }
          return;
        }

        await verifySession();
        const nextStatus = await loadStatus();
        if (!cancelled) {
          setAuthenticated(true);
          setStatus(nextStatus);
          setAuthError(null);
        }
      } catch (e: any) {
        await clearToken();
        if (!cancelled) {
          setAuthenticated(false);
          setStatus(null);
          setAuthError(
            e?.message
              ? `${e.message} (API: ${API_BASE_URL})`
              : `Sesión inválida (API: ${API_BASE_URL})`
          );
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ ready, authenticated, authError, status, refreshStatus, signOut }),
    [ready, authenticated, authError, status, refreshStatus, signOut]
  );

  return <WalletAuthContext.Provider value={value}>{children}</WalletAuthContext.Provider>;
}

export function useWalletAuth() {
  const ctx = useContext(WalletAuthContext);
  if (!ctx) throw new Error('useWalletAuth must be used within WalletAuthProvider');
  return ctx;
}
