import express from "express";
import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

/**
 * Verificar si un correo pertenece a un admin
 * POST /admin-auth/check-admin
 */
router.post("/check-admin", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: "Email requerido" });
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.json({ success: true, isAdmin: false });
    }

    // Verificar que sea admin
    if (user.role !== "ADMIN" && user.role !== "ADMIN_WORKER") {
      return res.json({ success: true, isAdmin: false });
    }

    return res.json({ success: true, isAdmin: true });
  } catch (error) {
    console.error("Error checking admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Verificar contraseña secreta del panel admin
 * POST /admin-auth/verify-secret
 */
router.post("/verify-secret", async (req, res) => {
  try {
    const { secretPassword } = req.body;

    if (!secretPassword) {
      return res.status(400).json({ success: false, error: "Contraseña secreta requerida" });
    }

    // Buscar la contraseña secreta en la base de datos
    const adminAccess = await prisma.adminAccess.findFirst();

    if (!adminAccess) {
      // Si no existe, crear con la contraseña por defecto
      const defaultPassword = "SoyPeruana6767.el207";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      const newAdminAccess = await prisma.adminAccess.create({
        data: {
          secretPassword: hashedPassword,
          createdBy: 1
        }
      });

      const isValid = await bcrypt.compare(secretPassword, newAdminAccess.secretPassword);
      
      if (isValid) {
        return res.json({ success: true, verified: true });
      } else {
        return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
      }
    }

    const isValid = await bcrypt.compare(secretPassword, adminAccess.secretPassword);

    if (isValid) {
      return res.json({ success: true, verified: true });
    } else {
      return res.status(401).json({ success: false, error: "Contraseña incorrecta" });
    }
  } catch (error) {
    console.error("Error verifying secret password:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Login de admin con correo y contraseña personal
 * POST /admin-auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email y contraseña requeridos" });
    }

    // Validar contraseña: al menos 8 caracteres y 1 mayúscula
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres" });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 1 mayúscula" });
    }

    // Buscar el usuario admin
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ success: false, error: "Credenciales incorrectas" });
    }

    // Verificar que sea admin
    if (user.role !== "ADMIN" && user.role !== "ADMIN_WORKER") {
      return res.status(403).json({ success: false, error: "No tienes permisos de admin" });
    }

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password || "");

    if (!isValid) {
      return res.status(401).json({ success: false, error: "Credenciales incorrectas" });
    }

    // Verificar si tiene 2FA habilitado
    if (user.twoFactorEnabled) {
      return res.json({ 
        success: true, 
        requiresTwoFactor: true,
        userId: user.id,
        email: user.email
      });
    }

    // Si no tiene 2FA, generar secreto y habilitarlo
    const secret = speakeasy.generateSecret({
      name: `Quilax Admin (${email})`,
      issuer: "Quilax"
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: true
      }
    });

    return res.json({ 
      success: true, 
      requiresTwoFactor: true,
      userId: user.id,
      email: user.email,
      qrCode: secret.otpauth_url
    });
  } catch (error) {
    console.error("Error in admin login:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Verificar código 2FA de Google Authenticator
 * POST /admin-auth/verify-2fa
 */
router.post("/verify-2fa", async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({ success: false, error: "ID de usuario y token requeridos" });
    }

    // Buscar el usuario
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: "Usuario no encontrado o 2FA no configurado" });
    }

    // Verificar el token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token
    });

    if (verified) {
      const authToken = generateToken(user);
      return res.json({ success: true, verified: true, token: authToken });
    } else {
      return res.status(401).json({ success: false, error: "Código 2FA incorrecto" });
    }
  } catch (error) {
    console.error("Error verifying 2FA:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cambiar contraseña secreta del panel admin (solo admin principal)
 * POST /admin-auth/change-secret
 */
router.post("/change-secret", auth, async (req, res) => {
  try {
    const { currentSecret, newSecret } = req.body;
    const adminId = req.user?.id;

    if (!currentSecret || !newSecret) {
      return res.status(400).json({ success: false, error: "Contraseña actual y nueva requeridas" });
    }

    // Verificar que sea admin principal
    const user = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Solo el admin principal puede cambiar la contraseña secreta" });
    }

    // Verificar contraseña actual
    const adminAccess = await prisma.adminAccess.findFirst();

    if (!adminAccess) {
      return res.status(404).json({ success: false, error: "Configuración de acceso no encontrada" });
    }

    const isValid = await bcrypt.compare(currentSecret, adminAccess.secretPassword);

    if (!isValid) {
      return res.status(401).json({ success: false, error: "Contraseña actual incorrecta" });
    }

    // Calcular fecha de cambio (48 horas después)
    const changeScheduledAt = new Date();
    changeScheduledAt.setHours(changeScheduledAt.getHours() + 48);

    // Hashear y guardar nueva contraseña como pendiente
    const hashedPassword = await bcrypt.hash(newSecret, 10);

    await prisma.adminAccess.update({
      where: { id: adminAccess.id },
      data: {
        pendingPassword: hashedPassword,
        changeScheduledAt: changeScheduledAt
      }
    });

    // Obtener todos los admin workers
    const adminWorkers = await prisma.user.findMany({
      where: {
        role: "ADMIN_WORKER"
      }
    });

    // Enviar notificación a cada admin worker
    const notifications = await Promise.all(
      adminWorkers.map(worker =>
        prisma.notification.create({
          data: {
            userId: worker.id,
            title: "Cambio de contraseña secreta",
            message: `La contraseña secreta del panel admin cambiará en 48 horas. Nueva contraseña: ${newSecret}`,
            type: "SECURITY"
          }
        })
      )
    );

    return res.json({ 
      success: true, 
      message: "Contraseña programada para cambiar en 48 horas",
      changeScheduledAt: changeScheduledAt,
      notificationsSent: notifications.length
    });
  } catch (error) {
    console.error("Error changing secret password:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cambiar contraseña personal del admin principal
 * POST /admin-auth/change-personal-password
 */
router.post("/change-personal-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Contraseña actual y nueva requeridas" });
    }

    // Validar nueva contraseña: al menos 8 caracteres y 1 mayúscula
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 8 caracteres" });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 1 mayúscula" });
    }

    // Verificar que sea admin principal
    const user = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ success: false, error: "Solo el admin principal puede cambiar su contraseña personal" });
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.password || "");

    if (!isValid) {
      return res.status(401).json({ success: false, error: "Contraseña actual incorrecta" });
    }

    // Hashear y guardar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: adminId },
      data: { password: hashedPassword }
    });

    return res.json({ 
      success: true, 
      message: "Contraseña personal cambiada exitosamente"
    });
  } catch (error) {
    console.error("Error changing personal password:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
