import apiClient from '@/lib/api';

/**
 * @param {string} text
 * @param {string} [language]
 */
export async function spellcheckText(text, language = 'es') {
  return apiClient.post('/quiz-creation/spellcheck', { text, language });
}

/** Clave estable para respetar overrides del usuario. */
export function spellOverrideKey(original, corrected) {
  return `${original}=>${corrected}`;
}
