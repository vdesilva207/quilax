/*
====================================
VALIDATE REQUEST
====================================
*/

export function requireFields(body, fields) {
  if (!body || typeof body !== "object") {
    throw new Error("Cuerpo de request inválido");
  }

  const missing = fields.filter((f) => !(f in body) || body[f] === undefined || body[f] === null);

  if (missing.length) {
    throw new Error(`Faltan campos requeridos: ${missing.join(", ")}`);
  }

  return true;
}

export function validateString(field, value, min = 1, max = 255) {
  if (typeof value !== "string") throw new Error(`${field} debe ser un string`);
  if (value.length < min || value.length > max)
    throw new Error(`${field} debe tener entre ${min} y ${max} caracteres`);
  return value.trim();
}

export function validateNumber(field, value, min = -Infinity, max = Infinity) {
  if (typeof value !== "number") throw new Error(`${field} debe ser un número`);
  if (value < min || value > max) throw new Error(`${field} fuera de rango`);
  return value;
}

export function validateDate(field, value) {
  const date = new Date(value);
  if (isNaN(date)) throw new Error(`${field} debe ser una fecha válida`);
  return date;
}