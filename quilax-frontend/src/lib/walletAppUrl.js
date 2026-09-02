import { WALLET_APP_URL } from '@/lib/api';

/** URL de Gestión. Si hay token de intercambio, lo añade como ?token= */
export function getWalletAppUrl(token) {
  const base = String(WALLET_APP_URL || '').replace(/\/$/, '');
  if (!token) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}token=${encodeURIComponent(token)}`;
}
