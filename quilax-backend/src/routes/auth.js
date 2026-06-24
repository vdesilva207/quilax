import express from "express";
import { register, login } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";
import { authRateLimit, sensitiveRateLimit } from "../middleware/rateLimit.js";
import prisma from "../lib/prisma.js";
import crypto from "crypto";
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";
import { getAvailableCurrencies, getExchangeRate } from "../services/currencyService.js";

const router = express.Router();

router.post("/register", (req, res, next) => {
  console.log("📝 /auth/register endpoint hit");
  next();
}, register);
router.post("/login", authRateLimit, login);

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
      return res.status(400).json({ error: "Email ya verificado" });
    }

    // Generar código de verificación de 6 dígitos
    const verificationCode = generateVerificationCode();

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: verificationCode }
    });

    // Enviar email real con el código
    const emailSent = await sendVerificationEmail(user.email, verificationCode);

    if (!emailSent) {
      return res.status(500).json({ error: "Error al enviar email de verificación" });
    }

    res.json({
      success: true,
      message: "Email de verificación enviado"
    });
  } catch (error) {
    console.error("Error sending verification email:", error);
    res.status(500).json({ error: "Error al enviar email de verificación" });
  }
});

// Verificar email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token es requerido" });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      return res.status(400).json({ error: "Token inválido" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null
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

// Solicitar reset de password
router.post("/forgot-password", sensitiveRateLimit, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email es requerido" });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Por seguridad, no revelamos si el email existe
      return res.json({
        success: true,
        message: "Si el email existe, recibirás un código para resetear tu contraseña"
      });
    }

    // Generar código de reset de 6 dígitos
    const resetCode = generateVerificationCode();
    const resetExpires = new Date(Date.now() + 900000); // 15 minutos

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetCode,
        resetPasswordExpires: resetExpires
      }
    });

    // Enviar email real con el código
    const emailSent = await sendPasswordResetEmail(user.email, resetCode);

    if (!emailSent) {
      return res.status(500).json({ error: "Error al enviar email de reset" });
    }

    res.json({
      success: true,
      message: "Email de reset enviado"
    });
  } catch (error) {
    console.error("Error sending reset email:", error);
    res.status(500).json({ error: "Error al enviar email de reset" });
  }
});

// Resetear password
router.post("/reset-password", sensitiveRateLimit, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token y nueva contraseña son requeridos" });
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

    // Aquí deberías hashear la nueva contraseña
    // Por ahora, la guardamos directamente (NO RECOMENDADO PARA PRODUCCIÓN)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newPassword, // TODO: Hashear contraseña
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

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar contraseña actual
    if (user.password !== currentPassword) { // TODO: Usar bcrypt.compare
      return res.status(400).json({ error: "Contraseña actual incorrecta" });
    }

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: newPassword } // TODO: Hashear contraseña
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

