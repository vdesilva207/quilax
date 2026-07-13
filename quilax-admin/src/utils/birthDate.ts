export type BirthDateValidation =
  | { ok: true; birthDate: Date }
  | { ok: false; error: string };

export function validateBirthDateParts(day: string, month: string, year: string): BirthDateValidation {
  if (!day || !month || !year) {
    return { ok: false, error: 'Completa tu fecha de nacimiento' };
  }

  const parsedDay = parseInt(day, 10);
  const parsedMonth = parseInt(month, 10);
  const parsedYear = parseInt(year, 10);
  const birthDate = new Date(parsedYear, parsedMonth - 1, parsedDay);

  if (
    Number.isNaN(parsedDay) ||
    Number.isNaN(parsedMonth) ||
    Number.isNaN(parsedYear) ||
    birthDate.getFullYear() !== parsedYear ||
    birthDate.getMonth() !== parsedMonth - 1 ||
    birthDate.getDate() !== parsedDay
  ) {
    return { ok: false, error: 'Introduce una fecha válida' };
  }

  const today = new Date();
  if (birthDate > today) {
    return { ok: false, error: 'La fecha no puede ser futura' };
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 18) {
    return { ok: false, error: 'Debes ser mayor de 18 años' };
  }

  return { ok: true, birthDate };
}
