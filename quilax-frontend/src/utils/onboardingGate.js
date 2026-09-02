/**
 * Resume KYC / onboarding after login or cold start.
 * Bank linking is optional (user can skip until deposit/withdraw).
 *
 * @param {object | null | undefined} user
 * @returns {string | null} expo-router href, or null if ready for (app)
 */
import Constants from 'expo-constants';

function isProductionLikeEnv() {
  const appEnv =
    Constants.expoConfig?.extra?.APP_ENV ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    '';
  if (appEnv === 'production' || appEnv === 'preview') return true;
  // Metro web prod export / release bundles
  if (process.env.NODE_ENV === 'production' && appEnv !== 'development') {
    return true;
  }
  return false;
}

/** Solo válido en desarrollo local. Nunca en preview/production. */
export function isDevSkipOnboarding() {
  if (isProductionLikeEnv()) return false;
  const extra = Constants.expoConfig?.extra || {};
  return (
    process.env.EXPO_PUBLIC_DEV_SKIP_ONBOARDING === 'true' ||
    process.env.EXPO_PUBLIC_SKIP_EMAIL_VERIFICATION === 'true' ||
    extra.EXPO_PUBLIC_DEV_SKIP_ONBOARDING === 'true' ||
    extra.EXPO_PUBLIC_SKIP_EMAIL_VERIFICATION === 'true'
  );
}

export function getOnboardingHref(user) {
  if (!user) return '/(auth)/welcome';

  // Fase de testeo local: entrar a la app sin código ni KYC.
  if (isDevSkipOnboarding()) {
    return null;
  }

  if (!user.emailVerified) {
    return '/(auth)/verify-email';
  }

  if (!user.country) {
    return '/(auth)/currency-selection';
  }

  // Stripe Identity verifies document + selfie/liveness. No separate face-scan step.
  if (!user.idVerified) {
    return '/(auth)/id-verification';
  }

  if (!user.gender || !user.province) {
    return '/(auth)/complete-profile';
  }

  return null;
}

export function isOnboardingComplete(user) {
  return getOnboardingHref(user) === null;
}
