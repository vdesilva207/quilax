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
    let {
      email,
      password,
      fullName,
      dateOfBirth,
      country,
      idDocumentNumber,
      idDocumentType,
      nationality,
    } = req.body;
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

    if (typeof fullName === "string" && fullName.trim()) {
      userData.fullName = fullName.trim().slice(0, 100);
    }
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (!Number.isNaN(birthDate.getTime())) {
        userData.dateOfBirth = birthDate;
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        userData.isOver18 = age >= 18;
      }
    }
    if (idDocumentNumber) {
      userData.idDocumentNumber = idDocumentNumber.toUpperCase().trim();
    }
    if (idDocumentType) {
      userData.idDocumentType = idDocumentType;
    }
    const countryCode = (country || nationality || "").toString().trim().toUpperCase().slice(0, 2);
    if (countryCode.length === 2) {
      userData.country = countryCode;
      userData.nationality = countryCode;
    }

    const user = await prisma.user.create({
      data: userData,
    });

    const token = generateToken(user);

    // Generar y guardar código; el email NO debe bloquear la respuesta (SMTP lento = timeout en el cliente)
    const verificationCode = generateVerificationCode();
    const emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationCode, emailVerificationExpires },
    });

    logRegisterSuccess(user.id, email, ipAddress, userAgent);

    const skipEmail =
      process.env.SKIP_EMAIL === 'true' || process.env.SKIP_EMAIL === '1';

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        emailVerified: false,
        idVerified: !!user.idVerified,
      },
      // Código en respuesta solo si SMTP está desactivado o no es producción
      ...(skipEmail || process.env.NODE_ENV !== 'production'
        ? { verificationCode }
        : {}),
      delivered: false,
    });

    // Fire-and-forget: timeouts internos en emailService evitan colgar el event loop
    sendVerificationEmail(email, verificationCode).catch((err) => {
      console.error("❌ post-register email:", err?.message || err);
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
        emailVerified: !!user.emailVerified,
        idVerified: !!user.idVerified,
        fullName: user.fullName,
        currency: user.currency,
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