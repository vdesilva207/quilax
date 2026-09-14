import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import it from './locales/it.json';

export const APP_LANGUAGES = ['es', 'en', 'fr', 'de', 'pt', 'nl', 'it'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

const LANGUAGE_KEY = 'language';

const resources = {
  es: { translation: es },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  nl: { translation: nl },
  it: { translation: it },
};

export function normalizeAppLanguage(code?: string | null): AppLanguage {
  if (!code) return 'es';
  const c = code.toLowerCase().slice(0, 2);
  if ((APP_LANGUAGES as readonly string[]).includes(c)) {
    return c as AppLanguage;
  }
  return 'es';
}

const LOCALE_MAP: Record<AppLanguage, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-PT',
  nl: 'nl-NL',
  it: 'it-IT',
};

export function appLanguageToLocale(lng?: string | null): string {
  return LOCALE_MAP[normalizeAppLanguage(lng ?? i18n.language)] ?? 'es-ES';
}

function detectLanguage(): AppLanguage {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored) return normalizeAppLanguage(stored);
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeAppLanguage(navigator.language);
  }
  return 'es';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
  returnObjects: false,
  parseMissingKeyHandler: (key) => key,
  react: {
    useSuspense: false,
  },
});

/** Load persisted language (localStorage key `language`, same as frontend). */
export async function hydrateAppLanguage() {
  try {
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored) {
      const lng = normalizeAppLanguage(stored);
      if (i18n.language !== lng) {
        await i18n.changeLanguage(lng);
      }
    }
  } catch {
    /* ignore */
  }
}

/** Change UI language and persist to localStorage. */
export async function setAppLanguage(code: string): Promise<AppLanguage> {
  const lng = normalizeAppLanguage(code);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lng);
  }
  await i18n.changeLanguage(lng);
  return lng;
}

export default i18n;
