import { Platform } from 'react-native';

const TOKEN_KEY = 'wallet_token';

function webStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Captura ?token= / #token= lo antes posible (antes de que Expo Router limpie la URL). */
export function captureTokenFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const search = new URLSearchParams(window.location.search);
    let token = search.get('token')?.trim() || null;
    if (!token && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, '');
      const hp = new URLSearchParams(hash.includes('=') ? hash : hash.replace(/^\?/, ''));
      token = hp.get('token')?.trim() || null;
    }
    if (token) {
      const store = webStorage();
      store?.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return null;
  }
}

export function readTokenFromUrl(): string | null {
  return captureTokenFromLocation();
}

export function stripTokenFromUrl() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    if (url.hash && url.hash.includes('token=')) {
      url.hash = '';
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', next || '/');
  } catch {
    /* ignore */
  }
}

// En web: capturar token en cuanto se carga el bundle
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  captureTokenFromLocation();
}
