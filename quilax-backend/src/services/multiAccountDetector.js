import prisma from "../lib/prisma.js";
import { logSuspiciousActivity, SuspiciousTypes } from "./suspiciousLogger.js";

/**
 * Máximo número de cuentas desde una misma IP
 * que pueden participar en un mismo quizRun
 */
const MAX_ACCOUNTS_PER_IP = 3;

/**
 * Detectar múltiples cuentas desde misma IP
 */
export async function detectMultiAccount({
  quizRunId,
  userId,
  ip,
}) {
  // ✅ HARDENING: validar IP correctamente
  if (!ip || typeof ip !== "string") {
    return { allowed: true };
  }

  try {
    const participants = await prisma.quizParticipant.findMany({
      where: { quizRunId },
      include: {
        user: {
          select: {
            id: true,
            lastLoginIp: true,
          },
        },
      },
    });

    const sameIpUsers = participants.filter(
      (p) => p.user?.lastLoginIp === ip
    );

    if (sameIpUsers.length > MAX_ACCOUNTS_PER_IP) {
      logSuspiciousActivity({
        type: SuspiciousTypes.MULTI_ACCOUNT_IP,
        userId,
        quizRunId,
        ip,
        details: {
          count: sameIpUsers.length,
        },
      });

      return {
        allowed: false,
        reason: "MULTI_ACCOUNT_IP",
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error("❌ multiAccountDetector error", err);
    return { allowed: true }; // fail-safe (no bloquear por error interno)
  }
}
