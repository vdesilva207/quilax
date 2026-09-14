/**
 * Capture SSO token before React/Expo Router can strip or remount.
 * Keys must match SessionBootstrap / secureStorage.
 */
(function () {
  try {
    var KEY = 'quilax_session_token';
    var APP = 'quilax_wallet_app_session';
    var params = new URLSearchParams(window.location.search || '');
    var token = params.get('token');
    if (!token && window.location.hash) {
      var raw = String(window.location.hash).replace(/^#/, '');
      if (raw.indexOf('token=') === 0) {
        token = decodeURIComponent(raw.slice(6).split(/[?&]/)[0] || '');
      } else {
        token = new URLSearchParams(raw).get('token');
      }
    }
    if (token && String(token).trim()) {
      token = String(token).trim();
      localStorage.setItem(KEY, token);
      sessionStorage.setItem(APP, '1');
      sessionStorage.removeItem('quilax_wallet_recovery_session');
      // Keep token in URL until SessionBootstrap cleans it (helps first paint).
    }
  } catch (e) {
    /* ignore */
  }
})();
