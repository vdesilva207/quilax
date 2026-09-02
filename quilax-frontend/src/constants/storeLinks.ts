/** Store / download links for invitees without the app. */
export const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL ||
  'https://apps.apple.com/app/quilax';

export const PLAY_STORE_URL =
  process.env.EXPO_PUBLIC_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.quilax.app';

/** Public web host for shareable quiz links (falls back to current origin / localhost). */
export function getPublicWebOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return (
    process.env.EXPO_PUBLIC_WEB_URL ||
    'https://quilax.app'
  ).replace(/\/$/, '');
}

export function buildQuizShareUrl(quizId: string | number) {
  return `${getPublicWebOrigin()}/quiz/${quizId}`;
}
