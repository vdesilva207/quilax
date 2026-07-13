import Constants from 'expo-constants';

const host =
  typeof window !== 'undefined' && window.location?.hostname
    ? window.location.hostname
    : '127.0.0.1';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  `http://${host}:3001`;

export const getApiUrl = (path) => `${API_BASE_URL}${path}`;

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
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(data.error || data.message || 'Error en la petición');
    }
    return response.json();
  }

  async get(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
      ...options,
    });
    return this.handleResponse(response);
  }

  async post(path, body, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      ...options,
    });
    return this.handleResponse(response);
  }

  async put(path, body, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      ...options,
    });
    return this.handleResponse(response);
  }

  async delete(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      ...options,
    });
    return this.handleResponse(response);
  }

  async patch(path, body, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      ...options,
    });
    return this.handleResponse(response);
  }
}

const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
