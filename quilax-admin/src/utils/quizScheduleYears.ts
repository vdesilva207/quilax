/** Años seleccionables: año actual + el siguiente (ventana móvil). */
export function getSelectableQuizYears(extraAhead = 1): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: extraAhead + 1 }, (_, i) => currentYear + i);
}
