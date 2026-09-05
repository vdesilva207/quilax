import { WALLET_APP_URL } from '@/lib/api';

/** URL de Gestión. Si hay token de intercambio, lo añade como ?token= en /sso */
export function getWalletAppUrl(token) {
  const base = String(WALLET_APP_URL || '').replace(/\/$/, '');
  if (!token) return base;
  // /sso captura el token antes de que el router limpie la query en "/"
  return `${base}/sso?token=${encodeURIComponent(token)}`;
}
