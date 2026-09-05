import { useEffect, useState, type ReactNode } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  clearRegistrationOnboarding,
  isRegistrationOnboardingActive,
} from '@/utils/onboardingGate';

type Options = {
  /**
   * Pantallas tempranas (moneda / país): si el usuario ya pasó KYC,
   * un flag viejo no debe reabrir el onboarding.
   */
  exitIfAlreadyVerified?: boolean;
};

type Gate =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'redirect'; href: '/(app)' | '/(auth)/welcome' };

/**
 * Pantallas de onboarding (moneda, país, Stripe…): solo durante el registro activo.
 * - Sin sesión → welcome
 * - Sesión sin flag de registro → app
 * - Flag activo (y no stale) → mostrar pantalla
 */
export function useRequireRegistrationOnboarding(options: Options = {}) {
  const { exitIfAlreadyVerified = false } = options;
  const { isAuthenticated, loading, user } = useAuth() as any;
  const [gate, setGate] = useState<Gate>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (loading) {
        if (!cancelled) setGate({ status: 'loading' });
        return;
      }

      if (!isAuthenticated) {
        await clearRegistrationOnboarding();
        if (!cancelled) setGate({ status: 'redirect', href: '/(auth)/welcome' });
        return;
      }

      const active = await isRegistrationOnboardingActive();
      if (cancelled) return;

      const staleAfterKyc =
        exitIfAlreadyVerified && !!(user?.idVerified || user?.gender || user?.province);

      if (!active || staleAfterKyc) {
        await clearRegistrationOnboarding();
        if (!cancelled) setGate({ status: 'redirect', href: '/(app)' });
        return;
      }

      if (!cancelled) setGate({ status: 'ready' });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    loading,
    exitIfAlreadyVerified,
    user?.idVerified,
    user?.gender,
    user?.province,
  ]);

  return gate;
}

/** Helper UI: spinner / redirect / children when gate allows. */
export function RegistrationOnboardingGate({
  gate,
  children,
  fallback,
}: {
  gate: Gate;
  children: ReactNode;
  fallback: ReactNode;
}) {
  if (gate.status === 'redirect') {
    return <Redirect href={gate.href} />;
  }
  if (gate.status !== 'ready') {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
