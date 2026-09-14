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
 * Puntos por pregunta según tiempo del creador:
 * - maxPoints (p.ej. 1000) al responder al instante
 * - 0 al final de answerTime (segundos de ventana de respuesta)
 * - lineal entre ambos
 */
export function calculateSecureScore({
  responseTimeMs,
  isCorrect,
  maxPoints = 1000,
  answerTimeSec = 10,
}) {
  if (!isCorrect) return 0;

  const maxPts = Math.max(1, Number(maxPoints) || 1000);
  const windowMs = Math.max(1000, (Number(answerTimeSec) || 10) * 1000);
  const t = Math.min(Math.max(Number(responseTimeMs) || 0, 0), windowMs);

  return Math.max(0, Math.round(maxPts * (1 - t / windowMs)));
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

