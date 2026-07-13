const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error en la petición');
  }
  return response.json();
}

export { API_BASE_URL };
