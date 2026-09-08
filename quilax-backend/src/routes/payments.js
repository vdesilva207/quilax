import express from "express";
import Stripe from "stripe";
import speakeasy from "speakeasy";
import prisma from "../lib/prisma.js";
import { auth } from "../middleware/auth.js";
import { requireMoneyEligibility } from "../middleware/moneyEligibility.js";
import { requireAllowedGeo } from "../middleware/geo.js";
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

// Wallet web (Connect return/refresh). Prefer WALLET_APP_URL over marketing FRONTEND_APP_URL.
const WALLET_BASE =
  process.env.WALLET_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.FRONTEND_APP_URL?.includes("gestion.")
    ? process.env.FRONTEND_APP_URL
    : null) ||
  "https://gestion.appquilax.com";

const PAYMENT_REGIONS = [
  {
    code: "EU",
    country: "ES",
    name: "España / UE",
    currency: "EUR",
    currencies: ["EUR"],
    active: true,
  },
  {
    code: "US",
    country: "US",
    name: "United States",
    currency: "USD",
    currencies: ["USD"],
    active: true,
  },
  {
    code: "GB",
    country: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencies: ["GBP"],
    active: false,
    comingSoon: true,
  },
  {
    code: "MX",
    country: "MX",
    name: "México",
    currency: "MXN",
    currencies: ["MXN"],
    active: false,
    comingSoon: true,
  },
];

function requireTotpIfEnabled(user, totpCode) {
  if (!user.twoFactorEnabled) return null;
  if (!totpCode) {
    return {
      status: 403,
      body: {
        requires2FA: true,
        error: "Se requiere código 2FA",
      },
    };
  }
  const ok = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token: String(totpCode).trim(),
    window: 1,
  });
  if (!ok) {
    return {
      status: 401,
      body: { error: "Código 2FA inválido" },
    };
  }
  return null;
}

async function createConnectAccountLink(accountId) {
  const base = WALLET_BASE.replace(/\/$/, "");
  const refreshUrl = `${base}/settings/bank?refresh=1`;
  const returnUrl = `${base}/settings/bank?return=1`;
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/** Marca banco verificado en BD cuando Connect ya permite payouts / datos enviados. */
async function syncBankVerifiedFromConnect(userId, { payoutsEnabled, detailsSubmitted }) {
  if (!payoutsEnabled && !detailsSubmitted) return;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isBankVerified: true },
    });
  } catch {
    /* ignore */
  }
}

// ============================
// REGIONES + STRIPE CONNECT
// (antes de rutas paramétricas)
// ============================

router.get("/regions", (_req, res) => {
  res.json({ regions: PAYMENT_REGIONS });
});

router.get("/connect/status", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        stripeConnectAccountId: true,
        isBankVerified: true,
        bankAccountIban: true,
        country: true,
        currency: true,
      },
    });

    if (!user?.stripeConnectAccountId) {
      return res.json({
        connected: false,
        hasConnectAccount: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        isBankVerified: !!user?.isBankVerified,
        canWithdraw: false,
        bankVerificationStatus: user?.isBankVerified ? "VERIFIED" : "PENDING",
        bankLast4: null,
        country: user?.country || null,
        currency: user?.currency || null,
        countryLocked: !!user?.country,
      });
    }

    let account;
    try {
      account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
    } catch (err) {
      console.error("Stripe accounts.retrieve failed:", err?.message || err);
      return res.json({
        connected: false,
        hasConnectAccount: true,
        accountId: user.stripeConnectAccountId,
        error: "No se pudo consultar la cuenta Connect",
        isBankVerified: !!user.isBankVerified,
        country: user.country || null,
        currency: user.currency || null,
        countryLocked: !!user.country,
      });
    }

    const chargesEnabled = !!account.charges_enabled;
    const payoutsEnabled = !!account.payouts_enabled;
    const detailsSubmitted = !!account.details_submitted;
    const connected = chargesEnabled && payoutsEnabled;

    await syncBankVerifiedFromConnect(req.user.id, { payoutsEnabled, detailsSubmitted });

    let bankLast4 = null;
    try {
      if (user.bankAccountIban) {
        const iban = decrypt(user.bankAccountIban);
        if (iban && iban.length >= 4) bankLast4 = iban.slice(-4);
      }
    } catch {
      // ignore decrypt errors
    }

    res.json({
      connected,
      hasConnectAccount: true,
      accountId: user.stripeConnectAccountId,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      isBankVerified: !!user.isBankVerified || connected,
      canWithdraw: payoutsEnabled && (user.isBankVerified || detailsSubmitted),
      bankVerificationStatus:
        connected || user.isBankVerified ? "VERIFIED" : detailsSubmitted ? "PENDING" : "NOT_STARTED",
      bankLast4,
      country: user.country || account.country || null,
      currency: user.currency || null,
      countryLocked: !!user.country,
    });
  } catch (error) {
    console.error("Error getting connect status:", error);
    res.status(500).json({ error: "Error al obtener estado Connect" });
  }
});

router.post("/connect/onboard", auth, requireAllowedGeo(), requireMoneyEligibility("BANK_UPDATE"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { country } = req.body || {};

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (country && !user.country) {
      const code = String(country).trim().toUpperCase().slice(0, 2);
      user = await prisma.user.update({
        where: { id: userId },
        data: { country: code, nationality: code },
      });
    }

    let accountId = user.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: (user.country || "ES").slice(0, 2),
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { userId: String(userId) },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const link = await createConnectAccountLink(accountId);
    res.json({ url: link.url, accountId });
  } catch (error) {
    console.error("Error onboarding Connect:", error);
    res.status(400).json({ error: error.message || "Error al iniciar onboarding" });
  }
});

router.post("/connect/refresh", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeConnectAccountId: true },
    });

    if (!user?.stripeConnectAccountId) {
      return res.status(400).json({ error: "No hay cuenta Connect. Usa /connect/onboard primero." });
    }

    const link = await createConnectAccountLink(user.stripeConnectAccountId);
    res.json({ url: link.url, accountId: user.stripeConnectAccountId });
  } catch (error) {
    console.error("Error refreshing Connect link:", error);
    res.status(400).json({ error: error.message || "Error al refrescar enlace Connect" });
  }
});

/** Abre el Dashboard Express de Stripe para gestionar IBAN / identidad. */
router.post("/connect/dashboard", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeConnectAccountId: true },
    });
    if (!user?.stripeConnectAccountId) {
      return res.status(400).json({ error: "Primero conecta tu cuenta bancaria" });
    }
    const link = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
    res.json({ url: link.url });
  } catch (error) {
    console.error("Error creating Connect login link:", error);
    res.status(400).json({
      error: error.message || "No se pudo abrir el panel de Stripe. Completa el onboarding primero.",
    });
  }
});

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
router.post(
  "/create-intent",
  auth,
  requireAllowedGeo(),
  requireMoneyEligibility("DEPOSIT"),
  async (req, res) => {
  try {
    const { credits, totpCode } = req.body;
    const userId = req.user.id;

    const totpError = requireTotpIfEnabled(req.user, totpCode);
    if (totpError) {
      return res.status(totpError.status).json(totpError.body);
    }

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

// País del usuario (settings / currency lock)
router.get("/country", auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { country: true, currency: true, nationality: true },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      success: true,
      country: user.country || user.nationality || null,
      currency: user.currency,
    });
  } catch (error) {
    console.error("Error getting country:", error);
    res.status(500).json({ error: "Error al obtener país" });
  }
});

router.put("/country", auth, async (req, res) => {
  try {
    const { country, syncCurrency } = req.body || {};
    if (!country) return res.status(400).json({ error: "country requerido" });
    const code = String(country).trim().toUpperCase().slice(0, 2);
    if (code.length !== 2) return res.status(400).json({ error: "Código de país inválido" });

    const data = { country: code, nationality: code };
    // Opcional: mapear moneda por país (mínimo ES→EUR)
    if (syncCurrency) {
      const currencyByCountry = {
        ES: "EUR", PT: "EUR", FR: "EUR", DE: "EUR", IT: "EUR",
        US: "USD", MX: "MXN", AR: "ARS", CO: "COP", CL: "CLP",
        PE: "PEN", BR: "BRL", GB: "GBP",
      };
      if (currencyByCountry[code]) data.currency = currencyByCountry[code];
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { country: true, currency: true, nationality: true },
    });
    res.json({ success: true, ...updated });
  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ error: "Error al actualizar país" });
  }
});

export default router;
