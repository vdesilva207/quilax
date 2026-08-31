(function () {
  'use strict';

  var CONFIG = {
    appScheme: 'quilax://open',
    appStoreUrl: 'https://apps.apple.com/app/quilax',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.quilax.app',
    storageKey: 'quilax_app_opened',
    langKey: 'language',
    fallbackLang: 'es',
    openTimeoutMs: 2200,
  };

  var currentLocale = CONFIG.fallbackLang;

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isMobile() {
    return isIOS() || isAndroid();
  }

  function getNested(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      if (acc == null) return undefined;
      return acc[key];
    }, obj);
  }

  function detectLanguage() {
    var saved = localStorage.getItem(CONFIG.langKey);
    if (saved && window.QUILAX_LOCALES[saved]) return saved;

    var browser = (navigator.language || navigator.userLanguage || '').slice(0, 2).toLowerCase();
    if (window.QUILAX_LOCALES[browser]) return browser;
    return CONFIG.fallbackLang;
  }

  function t(key) {
    var val = getNested(window.QUILAX_LOCALES[currentLocale], key);
    if (val != null) return val;
    return getNested(window.QUILAX_LOCALES[CONFIG.fallbackLang], key) || key;
  }

  function hasOpenedAppBefore() {
    return localStorage.getItem(CONFIG.storageKey) === '1';
  }

  function markAppOpened() {
    localStorage.setItem(CONFIG.storageKey, '1');
    updateCtaLabels();
  }

  function getCtaLabel() {
    if (isMobile() && hasOpenedAppBefore()) {
      return t('cta.openApp');
    }
    if (isIOS()) return t('cta.appStore');
    if (isAndroid()) return t('cta.playStore');
    return t('cta.download');
  }

  function updateCtaLabels() {
    var label = getCtaLabel();
    var primary = document.getElementById('cta-primary');
    var secondary = document.getElementById('cta-secondary');
    if (primary) primary.textContent = label;
    if (secondary) secondary.textContent = label;
  }

  function applyTranslations() {
    var locale = window.QUILAX_LOCALES[currentLocale];
    if (!locale) return;

    document.documentElement.lang = currentLocale;
    document.title = locale.meta.title;

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', locale.meta.description);

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = getNested(locale, key);
      if (val != null) el.textContent = val;
    });

    var langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = currentLocale;

    updateCtaLabels();
  }

  function setLanguage(code) {
    if (!window.QUILAX_LOCALES[code]) return;
    currentLocale = code;
    localStorage.setItem(CONFIG.langKey, code);
    applyTranslations();
  }

  function openAppOrStore() {
    if (!isMobile()) {
      window.open(CONFIG.appStoreUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    var storeUrl = isIOS() ? CONFIG.appStoreUrl : CONFIG.playStoreUrl;
    var hidden = false;

    function onHide() {
      hidden = true;
      markAppOpened();
    }

    document.addEventListener('visibilitychange', function handler() {
      if (document.visibilityState === 'hidden') {
        onHide();
        document.removeEventListener('visibilitychange', handler);
      }
    });

    window.addEventListener('blur', function onBlur() {
      onHide();
      window.removeEventListener('blur', onBlur);
    }, { once: true });

    if (isIOS()) {
      window.location.href = CONFIG.appScheme;
      setTimeout(function () {
        if (!hidden && document.visibilityState === 'visible') {
          window.location.href = storeUrl;
        }
      }, CONFIG.openTimeoutMs);
      return;
    }

    if (isAndroid()) {
      var intent =
        'intent://open#Intent;scheme=quilax;package=com.quilax.app;S.browser_fallback_url=' +
        encodeURIComponent(CONFIG.playStoreUrl) +
        ';end';
      window.location.href = intent;
      setTimeout(function () {
        if (!hidden && document.visibilityState === 'visible') {
          window.location.href = CONFIG.playStoreUrl;
        }
      }, CONFIG.openTimeoutMs);
    }
  }

  function initStoreLinks() {
    var appStore = document.getElementById('badge-appstore');
    var playStore = document.getElementById('badge-playstore');
    if (appStore) appStore.href = CONFIG.appStoreUrl;
    if (playStore) playStore.href = CONFIG.playStoreUrl;
  }

  function initMobileMenu() {
    var toggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('mobile-nav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', function () {
      var open = nav.hasAttribute('hidden');
      if (open) {
        nav.removeAttribute('hidden');
        toggle.setAttribute('aria-expanded', 'true');
      } else {
        nav.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function init() {
    currentLocale = detectLanguage();
    document.getElementById('year').textContent = String(new Date().getFullYear());

    initStoreLinks();
    applyTranslations();

    document.getElementById('lang-select').addEventListener('change', function (e) {
      setLanguage(e.target.value);
    });

    document.getElementById('cta-primary').addEventListener('click', openAppOrStore);
    document.getElementById('cta-secondary').addEventListener('click', openAppOrStore);

    initMobileMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
