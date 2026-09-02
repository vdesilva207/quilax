import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import it from './locales/it.json';

export const APP_LANGUAGES = ['es', 'en', 'fr', 'de', 'pt', 'nl', 'it'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

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

function detectLanguage(): AppLanguage {
  try {
    const { getLocales } = require('expo-localization');
    const code = getLocales()?.[0]?.languageCode;
    if (code) return normalizeAppLanguage(code);
  } catch {
    /* ignore */
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
  // Evita el mensaje "returned an object instead of string" en claves mal usadas
  returnObjects: false,
  parseMissingKeyHandler: (key) => key,
  react: {
    useSuspense: false,
  },
});

/** Carga idioma guardado (AsyncStorage) al arrancar la app. */
export async function hydrateAppLanguage() {
  try {
    const stored = await AsyncStorage.getItem('language');
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

/** Cambia idioma de UI + persiste (+ API si hay token). */
export async function setAppLanguage(
  code: string,
  opts?: { syncProfile?: (lng: AppLanguage) => Promise<void> }
) {
  const lng = normalizeAppLanguage(code);
  await AsyncStorage.setItem('language', lng);
  await i18n.changeLanguage(lng);
  if (opts?.syncProfile) {
    try {
      await opts.syncProfile(lng);
    } catch {
      /* offline / no auth */
    }
  }
  return lng;
}

export default i18n;
