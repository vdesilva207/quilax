import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** Host del Mac en la LAN cuando la app corre en dispositivo físico (Expo Go / dev client). */
export function resolveDevHost() {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    const h = window.location.hostname;
    if (h && h !== 'localhost') return h;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }

  const debuggerHost =
    Constants.expoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const host = String(debuggerHost).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }

  return '127.0.0.1';
}

/** Sustituye localhost/127.0.0.1 por la IP LAN del Mac en desarrollo. */
export function rewriteLocalhostUrl(url) {
  const raw = String(url || '').replace(/\/$/, '');
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return raw;
    const devHost = resolveDevHost();
    if (devHost === '127.0.0.1' || devHost === 'localhost') return raw;
    u.hostname = devHost;
    return u.toString().replace(/\/$/, '');
  } catch {
    return raw;
  }
}
