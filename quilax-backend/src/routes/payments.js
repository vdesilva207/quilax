import express from "express";
import Stripe from "stripe";
import speakeasy from "speakeasy";
import prisma from "../lib/prisma.js";
import { auth } from "../middleware/auth.js";
import { requireMoneyEligibility } from "../middleware/moneyEligibility.js";
import { requireAllowedGeo } from "../middleware/geo.js";
import {
  createPaymentIntent,
  quoteDepositCredits,
  getUserPaymentHistory,
  getAvailablePackages,
  updateBankAccount,
  updateUserAgeVerification
} from "../services/paymentService.js";
import { decrypt, encryptIBAN, encryptAccountName } from "../services/encryption.js";
import {
  PAYMENT_REGIONS,
  isKnownPaymentCountry,
  currencyForCountry,
} from "../constants/paymentRegions.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Publishable key for wallet Stripe.js (safe to expose). */
router.get("/config", (_req, res) => {
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    "";
  res.json({
    success: true,
    publishableKey: publishableKey || null,
    configured: Boolean(publishableKey),
  });
});

// Wallet web (Connect return/refresh). Prefer WALLET_APP_URL over marketing FRONTEND_APP_URL.
const WALLET_BASE =
  process.env.WALLET_APP_URL ||
  process.env.FRONTEND_URL ||
  (process.env.FRONTEND_APP_URL?.includes("gestion.")
    ? process.env.FRONTEND_APP_URL
    : null) ||
  "https://gestion.appquilax.com";

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

function resolveWalletBase(req) {
  const fallback = String(WALLET_BASE || "").replace(/\/$/, "");
  const candidates = [req?.headers?.origin, req?.headers?.referer].filter(Boolean);
  for (const raw of candidates) {
    try {
      const u = new URL(String(raw));
      const host = (u.hostname || "").toLowerCase();
      const ok =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("gestion.") ||
        host.includes("appquilax");
      if (ok) return `${u.protocol}//${u.host}`.replace(/\/$/, "");
    } catch {
      /* next */
    }
  }
  return fallback;
}

async function createConnectAccountLink(accountId, req) {
  const base = resolveWalletBase(req);
  const refreshUrl = `${base}/bank?connect=refresh`;
  const returnUrl = `${base}/bank?connect=return`;
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

/**
 * Perfil de plataforma: el usuario NO elige tipo de empresa.
 * Solo capability transfers (retiradas). Los pagos con tarjeta van por la plataforma.
 * IMPORTANTE: business_profile.url debe ser https público — Stripe rechaza localhost ("Not a valid URL").
 */
function connectBusinessProfile() {
  const candidates = [
    process.env.CONNECT_BUSINESS_URL,
    process.env.MARKETING_URL,
    "https://appquilax.com",
  ];
  let url = "https://appquilax.com";
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const u = new URL(String(raw).trim());
      const host = (u.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") continue;
      if (u.protocol !== "https:") continue;
      url = `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, "") || url;
      break;
    } catch {
      /* next */
    }
  }
  return {
    mcc: "5734",
    url,
    product_description:
      "Retiro de saldo de usuario en la plataforma Quilax (créditos de quiz/juego).",
  };
}

async function createExpressPayoutAccount({ country, email, userId }) {
  return stripe.accounts.create({
    type: "express",
    country,
    email: email || undefined,
    business_type: "individual",
    business_profile: connectBusinessProfile(),
    capabilities: {
      transfers: { requested: true },
    },
    metadata: { userId: String(userId) },
  });
}

/** Rellena datos de plataforma en cuentas Express aún no enviadas (omite pantallas de empresa). */
async function prefillExpressPayoutAccount(accountId, { email } = {}) {
  const profile = connectBusinessProfile();
  try {
    await stripe.accounts.update(accountId, {
      business_type: "individual",
      business_profile: profile,
      ...(email ? { email } : {}),
      capabilities: {
        transfers: { requested: true },
      },
    });
    return;
  } catch (err) {
    console.warn("Connect prefill (full) failed:", err?.message || err);
  }
  try {
    await stripe.accounts.update(accountId, {
      business_profile: profile,
      ...(email ? { email } : {}),
    });
  } catch (err) {
    console.warn("Connect prefill (profile) failed:", err?.message || err);
  }
}

/** Si la cuenta quedó a medias con flujo de empresa, recrear (solo test / no submitted). */
async function ensureExpressPayoutAccount(user) {
  const country = (user.country || "ES").toString().slice(0, 2).toUpperCase();
  let accountId = user.stripeConnectAccountId;

  if (accountId) {
    try {
      const account = await stripe.accounts.retrieve(accountId);
      if (account.details_submitted) {
        return accountId;
      }
      await prefillExpressPayoutAccount(accountId, { email: user.email });
      const refreshed = await stripe.accounts.retrieve(accountId);
      const profile = refreshed.business_profile || {};
      const prefilledOk =
        refreshed.business_type === "individual" &&
        (!!profile.product_description || !!profile.url);
      // Cuenta a medias / flujo de empresa → nueva Express solo-transfers.
      if (!prefilledOk || refreshed.business_type === "company") {
        accountId = null;
      }
    } catch (err) {
      console.warn("Connect retrieve/prefill failed, recreating:", err?.message || err);
      accountId = null;
    }
  }

  if (!accountId) {
    const account = await createExpressPayoutAccount({
      country,
      email: user.email,
      userId: user.id,
    });
    accountId = account.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  return accountId;
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
        bankVerificationStatus: user?.isBankVerified ? "VERIFIED" : "NOT_STARTED",
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
    const isBankVerified =
      connected ||
      !!user.isBankVerified ||
      (payoutsEnabled && detailsSubmitted) ||
      (detailsSubmitted && payoutsEnabled);

    // Re-leer flag persistido tras sync
    let persistedBank = !!user.isBankVerified;
    try {
      const fresh = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isBankVerified: true },
      });
      persistedBank = !!fresh?.isBankVerified;
    } catch {
      /* keep */
    }
    const bankOk = persistedBank || isBankVerified;

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
      isBankVerified: bankOk,
      canWithdraw: payoutsEnabled && bankOk,
      bankVerificationStatus:
        connected || bankOk ? "VERIFIED" : detailsSubmitted ? "PENDING" : "NOT_STARTED",
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
      if (!isKnownPaymentCountry(code)) {
        return res.status(400).json({ error: "País no soportado" });
      }
      const cur = currencyForCountry(code);
      user = await prisma.user.update({
        where: { id: userId },
        data: {
          country: code,
          nationality: code,
          ...(cur ? { currency: cur } : {}),
        },
      });
    }

    const connectCountry = (user.country || country || "ES").toString().slice(0, 2).toUpperCase();
    if (!isKnownPaymentCountry(connectCountry)) {
      return res.status(400).json({ error: "País no soportado", country: connectCountry });
    }

    let accountId = await ensureExpressPayoutAccount(user);

    const link = await createConnectAccountLink(accountId, req);
    res.json({ url: link.url, accountId, returnBase: resolveWalletBase(req) });
  } catch (error) {
    console.error("Error onboarding Connect:", error);
    res.status(400).json({ error: error.message || "Error al iniciar onboarding" });
  }
});

router.post("/connect/refresh", auth, requireAllowedGeo(), requireMoneyEligibility("BANK_UPDATE"), async (req, res) => {
  try {
    let user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        stripeConnectAccountId: true,
        country: true,
        email: true,
      },
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

    if (!user.country && req.body?.country) {
      const code = String(req.body.country).trim().toUpperCase().slice(0, 2);
      if (!isKnownPaymentCountry(code)) {
        return res.status(400).json({ error: "País no soportado", country: code });
      }
      const cur = currencyForCountry(code);
      user = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          country: code,
          nationality: code,
          ...(cur ? { currency: cur } : {}),
        },
        select: {
          id: true,
          stripeConnectAccountId: true,
          country: true,
          email: true,
        },
      });
    }

    const accountId = await ensureExpressPayoutAccount(user);
    const link = await createConnectAccountLink(accountId, req);
    res.json({ url: link.url, accountId, returnBase: resolveWalletBase(req) });
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

// Cotización depósito (cualquier cantidad >= 1)
router.get("/deposit-quote", auth, async (req, res) => {
  try {
    const credits = parseInt(req.query.credits, 10);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { currency: true },
    });
    const quote = quoteDepositCredits(credits, user?.currency || "EUR");
    res.json(quote);
  } catch (error) {
    res.status(400).json({ error: error.message || "Cotización no disponible" });
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

    const paymentIntent = await createPaymentIntent(userId, parseInt(credits, 10));
    
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

    if (!isKnownPaymentCountry(code)) {
      return res.status(400).json({ error: "País no soportado" });
    }

    const data = { country: code, nationality: code };
    if (syncCurrency) {
      const cur = currencyForCountry(code);
      if (cur) data.currency = cur;
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
