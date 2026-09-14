import { API_BASE_URL, WALLET_APP_URL } from '@/lib/api';

/**
 * URL de Gestión con token SSO.
 * Usamos /sso?token= (ruta dedicada) para no perder el token al hidratar Expo Router.
 * `lang` hereda el idioma de la app (sin selector en la wallet).
 */
export function getWalletAppUrl(token, lang) {
  let base = String(WALLET_APP_URL || '').replace(/\/$/, '');

  try {
    const api = new URL(API_BASE_URL);
    const wallet = new URL(base || 'http://127.0.0.1:8082');
    const apiLocal = api.hostname === '127.0.0.1' || api.hostname === 'localhost';
    const walletProd = /\.appquilax\.com$/i.test(wallet.hostname);
    if (apiLocal && walletProd) {
      base = `${api.protocol}//${api.hostname}:8082`;
    }
  } catch {
    /* keep base */
  }

  try {
    if (typeof window !== 'undefined' && window.location) {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1') {
        base = `${window.location.protocol}//${h}:8082`;
      }
    }
  } catch {
    /* keep */
  }

  if (!token) return base;
  const params = new URLSearchParams();
  params.set('token', String(token));
  const lng = lang ? String(lang).toLowerCase().slice(0, 2) : '';
  if (lng) params.set('lang', lng);
  return `${base}/sso?${params.toString()}`;
}
