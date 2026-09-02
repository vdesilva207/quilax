/**
 * Idioma del contenido del quiz (preguntas/título).
 * No se traduce: la UI de la app puede estar en otro idioma.
 * EN muestra banderas UK + USA según especificación de producto.
 */

export type QuizContentLanguage = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'nl' | 'it';

export const QUIZ_CONTENT_LANGUAGES: {
  code: QuizContentLanguage;
  labelKey: string;
  letters: string;
}[] = [
  { code: 'es', labelKey: 'quizLanguage.es', letters: 'ES' },
  { code: 'en', labelKey: 'quizLanguage.en', letters: 'EN' },
  { code: 'fr', labelKey: 'quizLanguage.fr', letters: 'FR' },
  { code: 'de', labelKey: 'quizLanguage.de', letters: 'DE' },
  { code: 'pt', labelKey: 'quizLanguage.pt', letters: 'PT' },
  { code: 'nl', labelKey: 'quizLanguage.nl', letters: 'NL' },
  { code: 'it', labelKey: 'quizLanguage.it', letters: 'IT' },
];

const QUIZ_CONTENT_LANGUAGE_SET = new Set<string>(
  QUIZ_CONTENT_LANGUAGES.map((l) => l.code)
);

export function normalizeQuizLanguage(value?: string | null): QuizContentLanguage {
  const code = String(value || 'es')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return QUIZ_CONTENT_LANGUAGE_SET.has(code) ? (code as QuizContentLanguage) : 'es';
}

export function getQuizLanguageMeta(value?: string | null) {
  const code = normalizeQuizLanguage(value);
  return QUIZ_CONTENT_LANGUAGES.find((l) => l.code === code)!;
}
