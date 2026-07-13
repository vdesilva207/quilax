import { skipGeoRestrictions } from "../utils/devFlags.js";

const DEFAULT_ALLOWED = (process.env.ALLOWED_COUNTRIES || "ES,PT,FR,DE,IT,NL,BE,AT,IE,LU")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export function detectCountry(req) {
  const header =
    req.headers["cf-ipcountry"] ||
    req.headers["x-country"] ||
    req.headers["x-forwarded-country"];

  if (typeof header === "string" && header.length === 2) {
    return header.toUpperCase();
  }

  const acceptLanguage = req.headers["accept-language"];
  if (typeof acceptLanguage === "string") {
    const match = acceptLanguage.match(/^[a-z]{2}-([A-Z]{2})/i);
    if (match) return match[1].toUpperCase();
  }

  return null;
}

export function isAllowedCountry(countryCode) {
  if (!countryCode) return true;
  if (skipGeoRestrictions()) return true;
  return DEFAULT_ALLOWED.includes(String(countryCode).toUpperCase());
}

export function geoMiddleware(req, res, next) {
  const country = detectCountry(req);
  req.geo = { country };
  next();
}

export function requireAllowedGeo() {
  return (req, res, next) => {
    const country = detectCountry(req);
    req.geo = { country };

    if (!isAllowedCountry(country)) {
      return res.status(403).json({
        error: "Servicio no disponible en tu región",
        country,
      });
    }

    return next();
  };
}

export default {
  detectCountry,
  isAllowedCountry,
  geoMiddleware,
  requireAllowedGeo,
};
