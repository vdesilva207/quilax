import express from "express";
import Stripe from "stripe";
import prisma from "../lib/prisma.js";
import { auth } from "../middleware/auth.js";
import {
  createPaymentIntent,
  getUserPaymentHistory,
  getAvailablePackages,
  updateBankAccount,
  updateUserAgeVerification
} from "../services/paymentService.js";
import { decrypt, encryptIBAN, encryptAccountName } from "../services/encryption.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================
// COMPRAR CRÉDITOS
// ============================

// Obtener paquetes disponibles
router.get("/packages", auth, async (req, res) => {
  try {
    const packages = getAvailablePackages();
    res.json({ packages });
  } catch (error) {
    console.error("Error getting packages:", error);
    res.status(500).json({ error: "Error al obtener paquetes" });
  }
});

// Crear payment intent para comprar créditos
router.post("/create-intent", auth, async (req, res) => {
  try {
    const { credits } = req.body;
    const userId = req.user.id;

    if (!credits || credits <= 0) {
      return res.status(400).json({ error: "Cantidad de créditos inválida" });
    }

    // Bloquear si ya hay un pago PENDING
    const existingPending = await prisma.payment.findFirst({
      where: {
        userId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return res.status(400).json({
        error: "Ya tienes un pago pendiente",
        paymentId: existingPending.id,
      });
    }

    const paymentIntent = await createPaymentIntent(userId, parseInt(credits));
    
    res.json({
      success: true,
      paymentIntent
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(400).json({ error: error.message });
  }
});

// ============================
// HISTORIAL DE PAGOS
// ============================

// Obtener historial de pagos del usuario
router.get("/history", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const history = await getUserPaymentHistory(userId, page, limit);
    
    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    console.error("Error getting payment history:", error);
    res.status(500).json({ error: "Error al obtener historial de pagos" });
  }
});

// Endpoint legacy para compatibilidad
router.get("/my", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getUserPaymentHistory(userId, 1, 50);
    res.json(history.payments);
  } catch (error) {
    console.error("Error getting payments:", error);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

// ============================
// VERIFICACIÓN BANCARIA
// ============================

// Actualizar cuenta bancaria para retiros
router.post("/bank-account", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { iban, accountName, bic } = req.body;

    const result = await updateBankAccount(userId, { iban, accountName, bic });
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("Error updating bank account:", error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener información de cuenta bancaria
router.get("/bank-account", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bankAccountIban: true,
        bankAccountName: true,
        bankAccountBic: true,
        isBankVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Desencriptar datos bancarios
    const decryptedIban = user.bankAccountIban ? decrypt(user.bankAccountIban) : null;
    const decryptedAccountName = user.bankAccountName ? decrypt(user.bankAccountName) : null;
    const decryptedBic = user.bankAccountBic ? decrypt(user.bankAccountBic) : null;

    // Ocultar IBAN completo por seguridad (mostrar solo últimos 4 caracteres)
    const maskedIban = decryptedIban 
      ? decryptedIban.replace(/.(?=.{4})/g, '*')
      : null;

    // Mascarar nombre del titular (mostrar solo primera letra)
    const maskedAccountName = decryptedAccountName
      ? decryptedAccountName.replace(/(\w)(\w*)/g, (g, first, rest) => first + '*'.repeat(rest.length))
      : null;

    res.json({
      success: true,
      bankAccount: {
        iban: maskedIban,
        accountName: maskedAccountName,
        bic: decryptedBic, // BIC no se mascara porque es menos sensible
        isVerified: user.isBankVerified
      }
    });
  } catch (error) {
    console.error("Error getting bank account:", error);
    res.status(500).json({ error: "Error al obtener información bancaria" });
  }
});

// ============================
// VERIFICACIÓN DE EDAD
// ============================

// Actualizar verificación de edad
router.post("/age-verification", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateOfBirth, guardianPhotoUrl, verificationVideoUrl } = req.body;

    const result = await updateUserAgeVerification(userId, {
      dateOfBirth,
      guardianPhotoUrl,
      verificationVideoUrl
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error("Error updating age verification:", error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener estado de verificación
router.get("/verification-status", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        dateOfBirth: true,
        isOver18: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true,
        isBankVerified: true,
        bankAccountIban: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({
      success: true,
      verification: {
        isAgeVerified: !!user.dateOfBirth,
        isOver18: user.isOver18,
        needsGuardianVerification: user.dateOfBirth && !user.isOver18 && !user.guardianPhotoUrl,
        isBankVerified: user.isBankVerified,
        hasBankAccount: !!user.bankAccountIban
      }
    });
  } catch (error) {
    console.error("Error getting verification status:", error);
    res.status(500).json({ error: "Error al obtener estado de verificación" });
  }
});

export default router;
