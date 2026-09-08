import prisma from "../lib/prisma.js";
import { detectCountry, isAllowedCountry } from "./geo.js";

async function loadUser(userId) {
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      email: true,
      balance: true,
      currency: true,
      isOver18: true,
      isBankVerified: true,
      bankAccountIban: true,
      stripeConnectAccountId: true,
      isBanned: true,
      idVerified: true,
      dateOfBirth: true,
    },
  });
}

/** KYC obligatorio salvo bypass explícito de desarrollo. */
function isKycRequired() {
  if (process.env.MONEY_REQUIRE_KYC === "false") return false;
  if (
    process.env.NODE_ENV !== "production" &&
    (process.env.DEV_SKIP_KYC === "true" || process.env.DEV_SKIP_KYC === "1")
  ) {
    return false;
  }
  return true;
}

function hasKyc(user) {
  if (user.idVerified) return true;
  return !isKycRequired();
}

function hasPayoutMethod(user) {
  const legacyBank = user.isBankVerified && !!user.bankAccountIban;
  const connectBank = user.isBankVerified && !!user.stripeConnectAccountId;
  return legacyBank || connectBank;
}

/**
 * @param {number} userId
 * @param {'DEPOSIT'|'WITHDRAW'|'QUIZ_ENTRY'|'BANK_UPDATE'} action
 * @param {{ country?: string|null }} [opts]
 */
export async function checkMoneyEligibility(userId, action, opts = {}) {
  const user = await loadUser(userId);
  if (!user) {
    return { allowed: false, status: 404, reason: "Usuario no encontrado", code: "USER_NOT_FOUND" };
  }

  if (user.isBanned) {
    return {
      allowed: false,
      status: 403,
      reason: "Cuenta suspendida",
      code: "ACCOUNT_BANNED",
    };
  }

  const country = opts.country !== undefined ? opts.country : null;
  if (country !== null && country !== undefined && !isAllowedCountry(country)) {
    return {
      allowed: false,
      status: 403,
      reason: "Servicio no disponible en tu región",
      code: "GEO_BLOCKED",
      country,
    };
  }

  switch (action) {
    case "DEPOSIT":
      if (!user.isOver18) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes ser mayor de 18 años para depositar",
          code: "UNDERAGE",
        };
      }
      if (!hasKyc(user)) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes verificar tu identidad (KYC) antes de depositar",
          code: "KYC_REQUIRED",
        };
      }
      return { allowed: true };

    case "QUIZ_ENTRY":
      if (!user.isOver18) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes ser mayor de 18 años",
          code: "UNDERAGE",
        };
      }
      if (user.balance < 1) {
        return {
          allowed: false,
          status: 400,
          reason: "Saldo insuficiente",
          code: "INSUFFICIENT_BALANCE",
          requiredCredits: 1,
        };
      }
      return { allowed: true };

    case "WITHDRAW":
      if (!user.isOver18) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes ser mayor de 18 años para retirar fondos",
          code: "UNDERAGE",
        };
      }
      if (!hasKyc(user)) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes verificar tu identidad (KYC) antes de retirar",
          code: "KYC_REQUIRED",
        };
      }
      if (!hasPayoutMethod(user)) {
        return {
          allowed: false,
          status: 403,
          reason: "Cuenta bancaria no verificada",
          code: "BANK_REQUIRED",
        };
      }
      return { allowed: true };

    case "BANK_UPDATE":
      if (!user.isOver18) {
        return {
          allowed: false,
          status: 403,
          reason: "Debes ser mayor de 18 años",
          code: "UNDERAGE",
        };
      }
      return { allowed: true };

    default:
      return {
        allowed: false,
        status: 400,
        reason: "Acción no soportada",
        code: "UNSUPPORTED_ACTION",
      };
  }
}

export function requireMoneyEligibility(action) {
  return async (req, res, next) => {
    try {
      const country = detectCountry(req);
      req.geo = { ...(req.geo || {}), country };

      const result = await checkMoneyEligibility(req.user.id, action, { country });
      if (!result.allowed) {
        return res.status(result.status || 403).json({
          error: result.reason,
          code: result.code,
          ...result,
        });
      }
      return next();
    } catch (err) {
      console.error("moneyEligibility error:", err);
      return res.status(500).json({ error: "Error de elegibilidad" });
    }
  };
}

export { detectCountry, isAllowedCountry };
export default { checkMoneyEligibility, requireMoneyEligibility };
