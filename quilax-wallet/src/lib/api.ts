import Constants from 'expo-constants';
import { getToken } from './secureStorage';

function resolveApiBaseUrl() {
  const fromExtra = Constants.expoConfig?.extra?.API_URL;
  const configured = (
    fromExtra ||
    process.env.EXPO_PUBLIC_API_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '');

  try {
    const u = new URL(configured);
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') {
      return configured;
    }
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const h = window.location.hostname;
      if (h && h !== '127.0.0.1' && h !== 'localhost') {
        u.hostname = h;
        return u.toString().replace(/\/$/, '');
      }
    }
  } catch {
    /* fall through */
  }
  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();

async function resolveAuthToken() {
  return getToken();
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  payload?: any;

  constructor(message: string, opts: { status?: number; code?: string; payload?: any } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.payload = opts.payload;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await resolveAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Platform': 'wallet',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new ApiError(errBody.error || errBody.message || 'Error en la petición', {
      status: response.status,
      code: errBody.code,
      payload: errBody,
    });
  }

  return response.json();
}
