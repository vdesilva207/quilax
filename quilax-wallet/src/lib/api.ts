import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '@/i18n';
import { getToken, saveToken, clearToken } from './secureStorage';

const extra = Constants.expoConfig?.extra || {};

function resolveApiBaseUrl(): string {
  const configured = (
    process.env.EXPO_PUBLIC_API_URL ||
    extra.API_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '');

  // localhost ≠ 127.0.0.1 → CORS "Failed to fetch" si el host de la wallet no coincide.
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const pageHost = (window.location.hostname || '').toLowerCase();
      const api = new URL(configured);
      const apiLocal = api.hostname === 'localhost' || api.hostname === '127.0.0.1';
      const pageLocal = pageHost === 'localhost' || pageHost === '127.0.0.1';
      if (apiLocal && pageLocal && api.hostname !== pageHost) {
        api.hostname = pageHost;
        return api.toString().replace(/\/$/, '');
      }
    } catch {
      /* keep configured */
    }
  }
  return configured;
}

const API_BASE_URL = resolveApiBaseUrl();

type ApiOptions = RequestInit & { auth?: boolean };

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: Record<string, unknown>;
  constructor(message: string, status: number, code?: string, data?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const { auth = true, headers, signal, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'wallet',
    ...(headers as Record<string, string>),
  };

  if (!finalHeaders['X-Country'] && typeof localStorage !== 'undefined') {
    try {
      const country = localStorage.getItem('wallet_country');
      if (country) finalHeaders['X-Country'] = country;
    } catch {
      /* ignore */
    }
  }

  if (auth) {
    const token = await getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const controller = !signal && typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 45000) : null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      signal: signal || controller?.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ApiError(i18n.t('errors.requestFailed', { defaultValue: 'La petición tardó demasiado' }), 408);
    }
    throw new ApiError(
      err?.message || i18n.t('errors.requestFailed', { defaultValue: 'No se pudo conectar con el servidor' }),
      0
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.error || data.message || i18n.t('errors.requestFailed'),
      response.status,
      data.code,
      data
    );
  }
  return data;
}

export async function loginWithPassword(
  email: string,
  password: string,
  totpCode?: string
) {
  const body: Record<string, string> = {
    email: email.trim().toLowerCase(),
    password,
  };
  if (totpCode) body.totpCode = totpCode;

  const data = await apiFetch('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(body),
  });
  if (!data?.token) throw new Error(i18n.t('errors.sessionNotReceived'));
  await saveToken(data.token);
  return data;
}

export async function logoutSession() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  await clearToken();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('quilax_wallet_app_session');
    sessionStorage.removeItem('quilax_wallet_recovery_session');
  }
}

export { API_BASE_URL, saveToken, getToken, clearToken };

/** Descarga un fichero binario autenticado (p. ej. justificante PDF). */
export async function apiDownload(path: string, filename: string) {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Client-Platform': 'wallet',
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error || data.message || i18n.t('errors.downloadError'),
      response.status,
      data.code,
      data
    );
  }
  const blob = await response.blob();
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  throw new Error(i18n.t('errors.downloadUnavailable'));
}
