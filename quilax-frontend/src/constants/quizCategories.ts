/** 30 quiz categories with very light pastel colors */
export const QUIZ_CATEGORIES = [
  'Ciencias', 'Matemáticas', 'Historia', 'Geografía', 'Literatura',
  'Arte', 'Música', 'Cine', 'Deportes', 'Tecnología',
  'Programación', 'Física', 'Química', 'Biología', 'Medicina',
  'Economía', 'Política', 'Filosofía', 'Religión', 'Mitología',
  'Naturaleza', 'Animales', 'Astronomía', 'Arquitectura', 'Gastronomía',
  'Idiomas', 'Cultura', 'Videojuegos', 'Anime', 'Cómics',
] as const;

export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

/** Very light pastels — soft tint, soft border, readable muted text */
export const QUIZ_CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Ciencias: { bg: '#F3FBF6', border: '#D4EBD9', text: '#4A7A58' },
  Matemáticas: { bg: '#F2F7FC', border: '#D2E2F2', text: '#4A6F90' },
  Historia: { bg: '#FCF7F1', border: '#F0E2D0', text: '#8A6A48' },
  Geografía: { bg: '#F1FAF8', border: '#D0EAE5', text: '#4A7A72' },
  Literatura: { bg: '#F8F4FA', border: '#E8DCEF', text: '#6F567A' },
  Arte: { bg: '#FCF4F6', border: '#F0DCE3', text: '#8A5A68' },
  Música: { bg: '#F6F4FB', border: '#E2DCF0', text: '#65588A' },
  Cine: { bg: '#F4F6F9', border: '#DEE4ED', text: '#5A6578' },
  Deportes: { bg: '#F4FAF2', border: '#D8ECD2', text: '#557A4A' },
  Tecnología: { bg: '#F1F8FB', border: '#D0E5F0', text: '#4A7085' },
  Programación: { bg: '#F3F6FB', border: '#D6E0F0', text: '#4A658A' },
  Física: { bg: '#F4F5FA', border: '#DCE0EE', text: '#555A7A' },
  Química: { bg: '#FBF6F2', border: '#EEDFD4', text: '#8A6550' },
  Biología: { bg: '#F3FAF5', border: '#D4EBD8', text: '#4A7A5A' },
  Medicina: { bg: '#FCF5F5', border: '#F0DCDC', text: '#8A5858' },
  Economía: { bg: '#FAF8F1', border: '#EEE6D0', text: '#7A6E48' },
  Política: { bg: '#F5F6F8', border: '#E2E5EC', text: '#5A6270' },
  Filosofía: { bg: '#F8F5FA', border: '#E8DCEE', text: '#6A5878' },
  Religión: { bg: '#FAF7F2', border: '#EEE6D8', text: '#7A6A50' },
  Mitología: { bg: '#F9F5F8', border: '#EADCE6', text: '#7A5870' },
  Naturaleza: { bg: '#F3FAF4', border: '#D6EBD8', text: '#4A7A55' },
  Animales: { bg: '#F7FAF2', border: '#E4EDD4', text: '#657A48' },
  Astronomía: { bg: '#F4F5FA', border: '#DCDEEE', text: '#555A7A' },
  Arquitectura: { bg: '#F7F6F4', border: '#E6E3DC', text: '#6A6558' },
  Gastronomía: { bg: '#FCF7F2', border: '#F0E2D4', text: '#8A6A50' },
  Idiomas: { bg: '#F2F8FA', border: '#D4E6EE', text: '#4A7080' },
  Cultura: { bg: '#F8F6F2', border: '#E8E2D4', text: '#6F6550' },
  Videojuegos: { bg: '#F2F8FA', border: '#D6E8F0', text: '#4A7080' },
  Anime: { bg: '#FAF4F8', border: '#ECDCE8', text: '#7A5870' },
  Cómics: { bg: '#FBF6F2', border: '#EEDFD4', text: '#8A6550' },
};

const FALLBACK = { bg: '#F7F5F2', border: '#E6E1DA', text: '#6A655E' };

export function getCategoryStyle(category?: string | null) {
  if (!category) return FALLBACK;
  const exact = QUIZ_CATEGORY_COLORS[category];
  if (exact) return exact;
  const key = Object.keys(QUIZ_CATEGORY_COLORS).find(
    (k) => k.toLowerCase() === String(category).toLowerCase(),
  );
  return key ? QUIZ_CATEGORY_COLORS[key] : FALLBACK;
}

/** Label shown in UI; stored category value stays as API key (Spanish). */
export function getCategoryLabel(
  category: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => string
) {
  if (!category) return '';
  return t(`categories.${category}`, { defaultValue: category });
}

export default QUIZ_CATEGORIES;
