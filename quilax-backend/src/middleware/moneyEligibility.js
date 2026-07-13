import prisma from "../lib/prisma.js";
import { requireAllowedGeo } from "./geo.js";

async function loadUser(userId) {
  return prisma.user.findUnique({
    where: { id: Number(userId) },
    select: {
      id: true,
      balance: true,
      currency: true,
      isOver18: true,
      isBankVerified: true,
      bankAccountIban: true,
      isBanned: true,
      idVerified: true,
      dateOfBirth: true,
    },
  });
}

export async function checkMoneyEligibility(userId, action) {
  const user = await loadUser(userId);
  if (!user) {
    return { allowed: false, status: 404, reason: "Usuario no encontrado" };
  }

  if (user.isBanned) {
    return { allowed: false, status: 403, reason: "Cuenta suspendida" };
  }

  switch (action) {
    case "DEPOSIT":
      return { allowed: true };

    case "QUIZ_ENTRY":
      if (!user.isOver18) {
        return { allowed: false, status: 403, reason: "Debes ser mayor de 18 años" };
      }
      if (user.balance < 1) {
        return { allowed: false, status: 400, reason: "Saldo insuficiente", requiredCredits: 1 };
      }
      return { allowed: true };

    case "WITHDRAW":
      if (!user.isOver18) {
        return { allowed: false, status: 403, reason: "Debes ser mayor de 18 años" };
      }
      if (!user.isBankVerified || !user.bankAccountIban) {
        return { allowed: false, status: 403, reason: "Cuenta bancaria no verificada" };
      }
      return { allowed: true };

    case "BANK_UPDATE":
      if (!user.isOver18) {
        return { allowed: false, status: 403, reason: "Debes ser mayor de 18 años" };
      }
      return { allowed: true };

    default:
      return { allowed: false, status: 400, reason: "Acción no soportada" };
  }
}

export function requireMoneyEligibility(action) {
  return async (req, res, next) => {
    try {
      const result = await checkMoneyEligibility(req.user.id, action);
      if (!result.allowed) {
        return res.status(result.status || 403).json({ error: result.reason, ...result });
      }
      return next();
    } catch (err) {
      console.error("moneyEligibility error:", err);
      return res.status(500).json({ error: "Error de elegibilidad" });
    }
  };
}

export { requireAllowedGeo };
export default { checkMoneyEligibility, requireMoneyEligibility };
