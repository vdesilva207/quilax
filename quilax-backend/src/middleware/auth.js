import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

/**
 * Middleware de autenticación HARDENED
 */
export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Invalid authorization header" });
    }

    const token = header.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token missing" });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!decoded?.id) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Cuenta suspendida
    if (user.isBanned) {
      return res.status(403).json({
        error: "Tu cuenta está suspendida. Contacta con soporte.",
        code: "ACCOUNT_BANNED",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return res.status(500).json({ error: "Auth error" });
  }
}

/**
 * Middleware de roles (manteniendo compatibilidad)
 */
export function roleMiddleware(roles = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!Array.isArray(roles) || roles.length === 0) {
        return next(); // sin restricción
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("❌ Role middleware error:", err);
      return res.status(500).json({ error: "Role check failed" });
    }
  };
}