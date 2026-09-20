import express from "express";
import { register, login } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";
import { rateLimiters } from "../middleware/rateLimiter.js";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { getAvailableCurrencies, getExchangeRate } from "../services/currencyService.js";

const router = express.Router();

router.post("/register", (req, res, next) => {
  console.log("📝 /auth/register endpoint hit");
  next();
}, register);
router.post("/login", rateLimiters.login, login);

router.get("/me", auth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      points: req.user.points,
      balance: req.user.balance,
      currency: req.user.currency,
      emailVerified: req.user.emailVerified,
      createdAt: req.user.createdAt,
    },
  });
});

/*
====================================
OBTENER TASAS DE CAMBIO
GET /auth/currencies
====================================
*/
router.get("/currencies", (req, res) => {
  try {
    const currencies = getAvailableCurrencies();
    res.json({
      success: true,
      currencies
    });
  } catch (error) {
    console.error("Error getting currencies:", error);
    res.status(500).json({ error: "Error al obtener tasas de cambio" });
  }
});

/*
====================================
ACTUALIZAR MONEDA DEL USUARIO
PUT /auth/currency
====================================
*/
router.put("/currency", auth, async (req, res) => {
  try {
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({ error: "Moneda requerida" });
    }

    // Verificar que la moneda sea válida
    const rate = getExchangeRate(currency);
    if (!rate) {
      return res.status(400).json({ error: "Moneda inválida" });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { currency }
    });

    res.json({
      success: true,
      currency
    });
  } catch (error) {
    console.error("Error updating currency:", error);
    res.status(500).json({ error: "Error al actualizar moneda" });
  }
});

// Enviar email de verificación
router.post("/send-verification-email", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    if (user.emailVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Email ya verificado',
      });
    }

    // Reutilizar código pendiente si existe; si no, generar uno nuevo
    const verificationCode =
      user.emailVerificationToken || generateVerificationCode();

    if (!user.emailVerificationToken) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: verificationCode,
          emailVerificationExpires: new Date(Date.now() + 15 * 60 * 1000),
        }
      });
    }

    const result = await sendVerificationEmail(user.email, verificationCode);
    const delivered = !!result?.delivered;

    res.json({
      success: true,
      message: delivered
        ? "Email de verificación enviado"
        : "No se pudo entregar el email; usa el código de respaldo",
      delivered,
      // Si Brevo falla o estamos en local, el front puede mostrar el código
      verificationCode,
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ error: "Error al enviar email de verificación" });
  }
});

// Verificar email
router.post("/verify-email", async (req, res) => {
  try {
    const raw = req.body?.token ?? req.body?.code ?? "";
    const token = String(raw).trim();

    if (!token) {
      return res.status(400).json({ error: "Token es requerido", code: "MISSING_CODE" });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({
        error: "Código inválido",
        code: "INVALID_CODE",
      });
    }

    if (
      user.emailVerificationExpires &&
      new Date(user.emailVerificationExpires).getTime() < Date.now()
    ) {
      return res.status(400).json({
        error: "Código expirado",
        code: "EXPIRED_CODE",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    });

    res.json({
      success: true,
      message: "Email verificado exitosamente"
    });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ error: "Error al verificar email" });
  }
});

// Solicitar reset de password (auth limiter: más holgado que sensitive 3/h)
router.post("/forgot-password", rateLimiters.auth, async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    if (!rawEmail || !String(rawEmail).trim()) {
      return res.status(400).json({ error: "Email es requerido", code: "EMAIL_REQUIRED" });
    }

    const email = String(rawEmail).trim().toLowerCase();

    // Exact match (lower) or original casing — avoid Prisma `mode: insensitive`
    // which can fail/crash on some deploy targets.
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user && email !== String(rawEmail).trim()) {
      user = await prisma.user.findUnique({
        where: { email: String(rawEmail).trim() },
      });
    }

    // Anti-enumeración: misma forma de respuesta si no existe
    if (!user) {
      return res.json({
        success: true,
        delivered: true,
        message: "Si el email existe, recibirás un código para resetear tu contraseña",
      });
    }

    const resetCode = generateVerificationCode();
    const resetExpires = new Date(Date.now() + 900000); // 15 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetCode,
        resetPasswordExpires: resetExpires,
      },
    });

    // Responder ya: no bloquear (ni tumbar) la API con SMTP lento/roto.
    res.json({
      success: true,
      delivered: true,
      message: "Si el email existe, recibirás un código para resetear tu contraseña",
    });

    sendPasswordResetEmail(user.email, resetCode).catch((err) => {
      console.error("Background reset email failed:", err?.message || err);
    });
  } catch (error) {
    console.error("Error sending reset email:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error al enviar email de reset", code: "RESET_EMAIL_ERROR" });
    }
  }
});

// Resetear password
router.post("/reset-password", rateLimiters.auth, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = req.body?.newPassword ?? req.body?.password;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
    }

    // Validar contraseña: al menos 8 caracteres y 1 mayúscula
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 1 mayúscula",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { gte: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido o expirado" });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    res.json({
      success: true,
      message: "Contraseña reseteada exitosamente"
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
});

// Cambiar contraseña (logueado)
router.post("/change-password", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Contraseña actual y nueva son requeridas" });
    }

    // Validar nueva contraseña: al menos 8 caracteres y 1 mayúscula
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 1 mayúscula",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar contraseña actual usando bcrypt.compare
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Contraseña actual incorrecta" });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: "Contraseña cambiada exitosamente"
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Error al cambiar contraseña" });
  }
});

// Logout
router.post("/logout", auth, async (req, res) => {
  try {
    // En una implementación real, invalidarías el token
    // Por ahora, solo devolvemos éxito
    res.json({
      success: true,
      message: "Logout exitoso"
    });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ error: "Error al hacer logout" });
  }
});

export default router;

