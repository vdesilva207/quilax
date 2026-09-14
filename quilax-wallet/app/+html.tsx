import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** Inline so it runs even before Metro hydrates the router. */
const SSO_BOOT = `
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
    }
    var lang = params.get('lang');
    if (lang && String(lang).trim()) {
      localStorage.setItem('language', String(lang).trim().toLowerCase().slice(0, 2));
    }
  } catch (e) {}
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `html,body,#root{margin:0;min-height:100%;font-family:'Sora','Segoe UI',ui-sans-serif,system-ui,sans-serif;background:#FFFCF8;color:#1C1917;}`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: SSO_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
