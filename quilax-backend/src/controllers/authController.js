import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import {
  logLoginSuccess,
  logLoginFailure,
  logRegisterSuccess,
  logRegisterFailure,
  logPasswordChange,
  logPasswordResetRequest,
  logPasswordResetSuccess,
  logEmailVerification,
} from "../services/securityLogger.js";
import { generateVerificationCode, sendVerificationEmail } from "../services/emailService.js";

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

export const register = async (req, res) => {
  try {
    console.log("📝 Register request received:", req.body);
    let { email, password, idDocumentNumber, idDocumentType, nationality } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    if (!email || !password) {
      logRegisterFailure(email, ipAddress, userAgent, "Email y password requeridos");
      return res.status(400).json({
        error: "Email y password requeridos",
      });
    }

    email = email.toLowerCase().trim();

    // Validar contraseña: al menos 8 caracteres y 1 mayúscula
    if (password.length < 8) {
      logRegisterFailure(email, ipAddress, userAgent, "Password demasiado corta");
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    if (!/[A-Z]/.test(password)) {
      logRegisterFailure(email, ipAddress, userAgent, "Password sin mayúscula");
      return res.status(400).json({
        error: "La contraseña debe tener al menos 1 mayúscula",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logRegisterFailure(email, ipAddress, userAgent, "Usuario ya existe");
      return res.status(400).json({
        error: "Usuario ya existe",
      });
    }

    // Validar que el documento de identidad no esté duplicado
    if (idDocumentNumber) {
      const existingDocument = await prisma.user.findUnique({
        where: { idDocumentNumber: idDocumentNumber.toUpperCase().trim() },
      });

      if (existingDocument) {
        logRegisterFailure(email, ipAddress, userAgent, "Documento de identidad duplicado");
        return res.status(400).json({
          error: "Ya existe una cuenta con este documento de identidad",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      email,
      password: hashedPassword,
      role: "USER",
    };

    // Agregar campos adicionales si están presentes
    if (idDocumentNumber) {
      userData.idDocumentNumber = idDocumentNumber.toUpperCase().trim();
    }
    if (idDocumentType) {
      userData.idDocumentType = idDocumentType;
    }
    if (nationality) {
      userData.nationality = nationality;
    }

    const user = await prisma.user.create({
      data: userData,
    });

    const token = generateToken(user);

    // Generar y enviar código de verificación
    const verificationCode = generateVerificationCode();
    
    // Guardar código de verificación en el usuario
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationCode }
    });
    
    await sendVerificationEmail(email, verificationCode);

    logRegisterSuccess(user.id, email, ipAddress, userAgent);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      verificationCode, // En desarrollo, devolver el código para facilitar pruebas
    });
  } catch (error) {
    console.error("❌ register error:", error);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    logRegisterFailure(req.body?.email, ipAddress, userAgent, error.message);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // 🔒 validación más segura
    if (!emailRaw || !password) {
      logLoginFailure(emailRaw, ipAddress, userAgent, "Missing credentials");
      return res.status(400).json({
        error: "Missing credentials",
      });
    }

    const email = emailRaw.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logLoginFailure(email, ipAddress, userAgent, "User not found");
      return res.status(401).json({
        error: "Credenciales incorrectas",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      logLoginFailure(email, ipAddress, userAgent, "Invalid password");
      return res.status(401).json({
        error: "Credenciales incorrectas",
      });
    }

    const token = generateToken(user);

    logLoginSuccess(user.id, email, ipAddress, userAgent);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("❌ login error:", error);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    logLoginFailure(req.body?.email, ipAddress, userAgent, error.message);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};