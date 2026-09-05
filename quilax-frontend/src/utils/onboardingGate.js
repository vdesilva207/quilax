/**
 * Onboarding gate — solo para el flujo de REGISTRO (después de crear cuenta).
 * El login y las sesiones ya abiertas van directo a /(app): email + contraseña basta.
 *
 * Flag `quilax_registration_onboarding` marca que el usuario está a mitad de registrarse.
 * Sin ese flag, las pantallas de moneda/país/Stripe redirigen a la app.
 */
import Constants from 'expo-constants';
import secureStorage from '@/lib/secureStorage';

const ONBOARDING_FLAG = 'quilax_registration_onboarding';

function isProductionLikeEnv() {
  const appEnv =
    Constants.expoConfig?.extra?.APP_ENV ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    '';
  if (appEnv === 'production' || appEnv === 'preview') return true;
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

export async function startRegistrationOnboarding() {
  await secureStorage.setItem(ONBOARDING_FLAG, '1');
}

export async function clearRegistrationOnboarding() {
  await secureStorage.removeItem(ONBOARDING_FLAG);
}

export async function isRegistrationOnboardingActive() {
  const v = await secureStorage.getItem(ONBOARDING_FLAG);
  return v === '1' || v === 'true';
}

/**
 * @param {object | null | undefined} user
 * @returns {string | null} expo-router href, or null if ready for (app)
 */
export function getOnboardingHref(user) {
  if (!user) return '/(auth)/welcome';

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
