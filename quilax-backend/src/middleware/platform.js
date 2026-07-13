function detectFromUserAgent(userAgent = "") {
  const ua = userAgent.toLowerCase();
  if (ua.includes("quilax-wallet")) return "wallet";
  if (ua.includes("quilax-admin")) return "admin";
  if (ua.includes("tauri")) return "desktop";
  if (ua.includes("expo") || ua.includes("reactnative")) {
    if (ua.includes("android")) return "android";
    if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
    return "mobile";
  }
  if (ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari")) return "web";
  return "unknown";
}

export function detectClientPlatform(req) {
  const explicit = req.headers["x-client-platform"];
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().toLowerCase();
  }
  return detectFromUserAgent(req.headers["user-agent"] || "");
}

export function platformMiddleware(req, res, next) {
  req.clientPlatform = detectClientPlatform(req);
  next();
}

export function requirePlatform(...allowed) {
  const normalized = allowed.map((p) => p.toLowerCase());
  return (req, res, next) => {
    const platform = detectClientPlatform(req);
    req.clientPlatform = platform;
    if (!normalized.includes(platform)) {
      return res.status(403).json({
        error: "Plataforma no autorizada",
        platform,
      });
    }
    return next();
  };
}

export default {
  detectClientPlatform,
  platformMiddleware,
  requirePlatform,
};
