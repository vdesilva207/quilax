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

/** Edad en años cumplidos a partir de fecha de nacimiento. */
export function ageFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return null;
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

/**
 * Mayoría de edad: flag, DOB del registro, o KYC ya verificado (Stripe Identity).
 * Si el DOB / KYC prueban ≥18 pero el flag está mal, lo corregimos en BD.
 */
async function resolveIsOver18(user) {
  if (user.isOver18) return true;

  const age = ageFromDateOfBirth(user.dateOfBirth);
  const fromDob = age != null && age >= 18;
  // Identity verificada implica adulto en la práctica (registro ya exige 18+).
  const fromKyc = !!user.idVerified;

  if (fromDob || fromKyc) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { isOver18: true },
      });
    } catch {
      /* ignore heal errors */
    }
    return true;
  }
  return false;
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

  const isOver18 = await resolveIsOver18(user);

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
      if (!isOver18) {
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
      if (!isOver18) {
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
      if (!isOver18) {
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
      if (!isOver18) {
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
