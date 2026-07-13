export function parseBirthDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateAge(birthDate: Date, reference = new Date()) {
  let age = reference.getFullYear() - birthDate.getFullYear();
  const monthDiff = reference.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAdult(birthDate: Date, reference = new Date()) {
  return calculateAge(birthDate, reference) >= 18;
}

export function formatBirthDate(value?: string | null) {
  const date = parseBirthDate(value);
  if (!date) return '';
  return date.toLocaleDateString();
}

export default {
  parseBirthDate,
  calculateAge,
  isAdult,
  formatBirthDate,
};
