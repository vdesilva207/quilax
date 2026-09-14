export function decodeJwtPayload(token) {
  const part = token.split('.')[1];
  if (!part) return null;

  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob !== 'undefined'
        ? atob(padded)
        : globalThis?.Buffer?.from(padded, 'base64')?.toString('utf8');
    if (!json) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token, skewSeconds = 30) {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (!payload.exp) return false;

  return Date.now() >= payload.exp * 1000 - skewSeconds * 1000;
}
