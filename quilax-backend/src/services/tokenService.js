import jwt from "jsonwebtoken";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || "7d";
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || "30d";

function getAccessSecret() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET no configurado");
  return process.env.JWT_SECRET;
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || getAccessSecret();
}

function buildPayload(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

export function generateAccessToken(user) {
  return jwt.sign(buildPayload(user), getAccessSecret(), { expiresIn: ACCESS_TTL });
}

export function generateRefreshToken(user) {
  return jwt.sign({ ...buildPayload(user), kind: "refresh" }, getRefreshSecret(), {
    expiresIn: REFRESH_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, getRefreshSecret());
  if (payload.kind !== "refresh") throw new Error("Token inválido");
  return payload;
}

export function decodeToken(token) {
  return jwt.decode(token);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
