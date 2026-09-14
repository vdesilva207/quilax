// API Client reutilizable para todas las llamadas al backend
import { Platform } from 'react-native';
import {
  getStoredAuthToken,
  getStoredRefreshToken,
  saveAuthSession,
  clearAuthSession,
} from '@/lib/secureStorage';
import { isAccessTokenExpired } from '@/lib/tokenUtils';

const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:3001`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3001';
  }

  return 'http://127.0.0.1:3001';
};

const API_BASE_URL = getApiBaseUrl();

const getApiUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** Rutas públicas: nunca enviar token viejo ni intentar refresh ante 401 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/admin-auth/check-admin',
  '/admin-auth/verify-secret',
  '/admin-auth/login',
  '/admin-auth/verify-2fa',
];

function isPublicAuthEndpoint(endpoint) {
  const path = endpoint.split('?')[0];
  return PUBLIC_AUTH_PATHS.includes(path);
}

let refreshPromise = null;

export async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('SESSION_EXPIRED');
    }

    const response = await fetch(getApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      await clearAuthSession();
      throw new Error('SESSION_EXPIRED');
    }

    const data = await response.json();
    await saveAuthSession({
      accessToken: data.token,
      refreshToken: data.refreshToken,
    });

    return data.token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function restoreStoredSession(apiClient) {
  const storedToken = await getStoredAuthToken();
  const storedRefresh = await getStoredRefreshToken();

  if (!storedToken && !storedRefresh) {
    return { ok: false };
  }

  if (storedToken && !isAccessTokenExpired(storedToken)) {
    apiClient.setToken(storedToken);
    return { ok: true, token: storedToken };
  }

  if (storedRefresh) {
    try {
      const newToken = await refreshAccessToken();
      apiClient.setToken(newToken);
      return { ok: true, token: newToken };
    } catch {
      await clearAuthSession();
      apiClient.clearToken();
      return { ok: false };
    }
  }

  await clearAuthSession();
  apiClient.clearToken();
  return { ok: false };
}

export async function authFetch(path, options = {}) {
  const token = await getStoredAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && token && !isPublicAuthEndpoint(path)) {
    try {
      const newToken = await refreshAccessToken();
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(getApiUrl(path), {
        ...options,
        headers,
      });
    } catch {
      throw new Error('Sesión expirada');
    }
  }

  return response;
}

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
    this.onSessionExpired = null;
  }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    this.token = null;
  }

  setSessionExpiredHandler(handler) {
    this.onSessionExpired = handler;
  }

  getHeaders({ includeAuth = true } = {}) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (includeAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  async handleResponse(response, retryFn) {
    if (response.status === 401 && retryFn) {
      try {
        const newToken = await refreshAccessToken();
        this.setToken(newToken);
        return retryFn(newToken);
      } catch {
        this.clearToken();
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
        throw new Error('Sesión expirada, inicia sesión de nuevo');
      }
    }

    if (response.status === 403) {
      const error = await response.json().catch(() => ({}));
      if (error.error?.includes('banned') || error.error?.includes('suspendida')) {
        this.clearToken();
        await clearAuthSession();
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      if (response.status === 429) {
        throw new Error(error.message || 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.');
      }
      throw new Error(error.error || error.message || 'Error en la petición');
    }

    return response.json();
  }

  async ensureToken() {
    if (!this.token) {
      const storedToken = await getStoredAuthToken();
      if (storedToken) {
        this.token = storedToken;
      }
    }
  }

  async request(method, endpoint, data, options = {}) {
    const isPublic = isPublicAuthEndpoint(endpoint);

    if (!isPublic) {
      await this.ensureToken();
    }

    const url = `${this.baseUrl}${endpoint}`;

    const doRequest = async () => {
      const fetchOptions = {
        method,
        headers: this.getHeaders({ includeAuth: !isPublic }),
        ...options,
      };

      if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);

      const retryFn = isPublic
        ? null
        : async () => {
            const retryResponse = await fetch(url, {
              ...fetchOptions,
              headers: this.getHeaders({ includeAuth: true }),
            });
            return this.handleResponse(retryResponse);
          };

      return this.handleResponse(response, retryFn);
    };

    try {
      return await doRequest();
    } catch (error) {
      if (__DEV__) {
        console.error(`${method} ${endpoint} failed`);
      }
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request('GET', endpoint, undefined, options);
  }

  async post(endpoint, data, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, undefined, options);
  }

  async patch(endpoint, data, options = {}) {
    return this.request('PATCH', endpoint, data, options);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export { API_BASE_URL, getApiUrl, getStoredAuthToken };
export default apiClient;
