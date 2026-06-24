/*
====================================
RATE LIMITER
====================================
*/

const rateLimits = new Map(); // ip -> { count, lastReset }

const WINDOW_MS = 60_000; // 1 minuto
const MAX_REQUESTS = 30; // máximo por IP por ventana

export function rateLimiter(ip) {
  if (!ip) throw new Error("IP inválida para rate limiter");

  const now = Date.now();
  let entry = rateLimits.get(ip);

  if (!entry) {
    entry = { count: 1, lastReset: now };
    rateLimits.set(ip, entry);
    return true;
  }

  // reset si pasó la ventana
  if (now - entry.lastReset > WINDOW_MS) {
    entry.count = 1;
    entry.lastReset = now;
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    throw new Error("Demasiadas solicitudes, espera un momento");
  }

  entry.count++;
  return true;
}

/*
====================================
TODO: Escalabilidad
====================================
- Para entornos distribuidos usar Redis en lugar de memoria local
- key por usuario o por IP dependiendo del endpoint
*/