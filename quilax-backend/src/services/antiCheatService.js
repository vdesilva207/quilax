import { logSuspiciousActivity, SuspiciousTypes } from "./suspiciousLogger.js";
import { detectMultiAccount } from "./multiAccountDetector.js";

/**
 * Tiempo mínimo humano para responder (ms)
 * respuestas más rápidas se marcan como sospechosas
 */
const MIN_HUMAN_RESPONSE_MS = 250;

/**
 * Validar que la respuesta esté dentro de la ventana
 */
export function validateAnswerWindow({ run, now }) {
  if (run.phase !== "QUESTION_ANSWER") {
    logSuspiciousActivity({
      type: SuspiciousTypes.INVALID_PHASE,
      quizRunId: run.id,
    });

    return {
      allowed: false,
      reason: "INVALID_PHASE",
    };
  }

  if (run.phaseEndsAt && now > run.phaseEndsAt) {
    logSuspiciousActivity({
      type: SuspiciousTypes.ANSWER_OUT_OF_WINDOW,
      quizRunId: run.id,
    });

    return {
      allowed: false,
      reason: "ANSWER_WINDOW_CLOSED",
    };
  }

  return { allowed: true };
}

/**
 * Calcular tiempo real desde el servidor
 */
export function calculateServerResponseTime({
  phaseStartedAt,
  now,
}) {
  if (!phaseStartedAt) return null;

  return now.getTime() - phaseStartedAt.getTime();
}

/**
 * Calcular score seguro
 */
export function calculateSecureScore({
  responseTimeMs,
  isCorrect,
}) {
  if (!isCorrect) return 0;

  const safeTime = Math.max(responseTimeMs || 0, 0);

  return Math.max(1000 - safeTime, 0);
}

/**
 * Detectar respuestas demasiado rápidas
 */
export function detectFastResponse({
  responseTimeMs,
  userId,
  quizRunId,
}) {
  if (responseTimeMs !== null && responseTimeMs < MIN_HUMAN_RESPONSE_MS) {
    logSuspiciousActivity({
      type: SuspiciousTypes.FAST_RESPONSE,
      userId,
      quizRunId,
      details: {
        responseTimeMs,
      },
    });
  }
}

/**
 * Ejecutar todas las validaciones anti-cheat
 */
export async function runAntiCheatChecks({
  run,
  userId,
  ip,
}) {
  const now = new Date();

  const windowCheck = validateAnswerWindow({
    run,
    now,
  });

  if (!windowCheck.allowed) {
    return windowCheck;
  }

  const multiAccountCheck = await detectMultiAccount({
    quizRunId: run.id,
    userId,
    ip,
  });

  if (!multiAccountCheck.allowed) {
    return multiAccountCheck;
  }

  return { allowed: true, now };
}

