import Constants from 'expo-constants';
import { Platform } from 'react-native';
import i18n from '@/i18n';
import { resolveDevHost, rewriteLocalhostUrl } from '@/lib/devHost';

const host = resolveDevHost();
const extra = Constants.expoConfig?.extra || {};

export const API_BASE_URL = rewriteLocalhostUrl(
  extra.API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    `http://${host}:3001`
);

export const WALLET_APP_URL = rewriteLocalhostUrl(
  extra.WALLET_URL ||
    process.env.EXPO_PUBLIC_WALLET_URL ||
    `http://${host}:8082`
);

export const SOCKET_URL = rewriteLocalhostUrl(
  extra.SOCKET_URL ||
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    API_BASE_URL
);

export const getApiUrl = (path) => `${API_BASE_URL}${path}`;

/** Default so slow networks never leave the UI hung on an endless spinner. */
const DEFAULT_TIMEOUT_MS = 12000;

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
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

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Platform': Platform.OS === 'web' ? 'web' : Platform.OS,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: i18n.t('common.unknownError') }));
      const err = new Error(data.error || data.message || i18n.t('common.requestError'));
      err.status = response.status;
      err.code = data.code;
      err.requires2FA = !!data.requires2FA;
      err.payload = data;
      throw err;
    }
    return response.json();
  }

  /**
   * Fetch with AbortController timeout. Pass timeoutMs: 0 to disable.
   * Existing callers that pass `signal` keep working; we abort either way.
   */
  async request(method, path, { body, headers: extraHeaders, timeoutMs, signal, ...rest } = {}) {
    const ms = timeoutMs === 0 ? 0 : timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    let timer = null;
    if (ms > 0) {
      timer = setTimeout(() => controller.abort(), ms);
    }
    const onExternalAbort = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', onExternalAbort, { once: true });
    }
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { ...this.getHeaders(), ...(extraHeaders || {}) },
        ...(body !== undefined ? { body } : {}),
        signal: controller.signal,
        ...rest,
      });
      return await this.handleResponse(response);
    } catch (error) {
      if (error?.name === 'AbortError') {
        const err = new Error(i18n.t('common.requestTimeout'));
        err.code = 'TIMEOUT';
        err.status = 408;
        throw err;
      }
      // Safari/WebKit: "Load failed" / "Failed to fetch" — never leak to product UI as-is.
      const raw = String(error?.message || '');
      if (
        !error?.status &&
        (/load failed/i.test(raw) ||
          /failed to fetch/i.test(raw) ||
          /networkerror/i.test(raw) ||
          error?.name === 'TypeError')
      ) {
        const err = new Error(i18n.t('common.networkError'));
        err.code = 'NETWORK';
        err.status = 0;
        throw err;
      }
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onExternalAbort);
    }
  }

  async get(path, options = {}) {
    return this.request('GET', path, options);
  }

  async post(path, body, options = {}) {
    return this.request('POST', path, {
      ...options,
      body: JSON.stringify(body),
    });
  }

  async put(path, body, options = {}) {
    return this.request('PUT', path, {
      ...options,
      body: JSON.stringify(body),
    });
  }

  async delete(path, body, options = {}) {
    return this.request('DELETE', path, {
      ...options,
      ...(body != null ? { body: JSON.stringify(body) } : {}),
    });
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
