import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const SECURITY_LOG_FILE = path.join(LOG_DIR, 'security.log');

// Asegurar que el directorio de logs existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Tipos de eventos de seguridad
 */
const SecurityEventType = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  BANK_ACCOUNT_UPDATE: 'BANK_ACCOUNT_UPDATE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  DATA_ENCRYPTION: 'DATA_ENCRYPTION',
  DATA_DECRYPTION: 'DATA_DECRYPTION',
};

/**
 * Niveles de severidad
 */
const Severity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

/**
 * Formatear fecha para logs
 */
const formatDate = () => {
  return new Date().toISOString();
};

/**
 * Escribir log de seguridad
 */
const writeSecurityLog = (event) => {
  const logEntry = {
    timestamp: formatDate(),
    severity: event.severity || Severity.INFO,
    eventType: event.eventType,
    userId: event.userId || null,
    email: event.email || null,
    ipAddress: event.ipAddress || null,
    userAgent: event.userAgent || null,
    details: event.details || {},
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    fs.appendFileSync(SECURITY_LOG_FILE, logLine);
  } catch (error) {
    console.error('Error writing security log:', error);
  }

  // También imprimir en consola para desarrollo
  console.log(`[SECURITY ${logEntry.severity}] ${logEntry.eventType}:`, logEntry);
};

/**
 * Log de login exitoso
 */
export const logLoginSuccess = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.LOGIN_SUCCESS,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de login fallido
 */
export const logLoginFailure = (email, ipAddress, userAgent, reason) => {
  writeSecurityLog({
    eventType: SecurityEventType.LOGIN_FAILURE,
    severity: Severity.WARNING,
    email,
    ipAddress,
    userAgent,
    details: { reason, timestamp: new Date().toISOString() },
  });
};

/**
 * Log de registro exitoso
 */
export const logRegisterSuccess = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.REGISTER_SUCCESS,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de registro fallido
 */
export const logRegisterFailure = (email, ipAddress, userAgent, reason) => {
  writeSecurityLog({
    eventType: SecurityEventType.REGISTER_FAILURE,
    severity: Severity.WARNING,
    email,
    ipAddress,
    userAgent,
    details: { reason, timestamp: new Date().toISOString() },
  });
};

/**
 * Log de cambio de contraseña
 */
export const logPasswordChange = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.PASSWORD_CHANGE,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de solicitud de reset de contraseña
 */
export const logPasswordResetRequest = (email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.PASSWORD_RESET_REQUEST,
    severity: Severity.INFO,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de reset de contraseña exitoso
 */
export const logPasswordResetSuccess = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.PASSWORD_RESET_SUCCESS,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de verificación de email
 */
export const logEmailVerification = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.EMAIL_VERIFICATION,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de actualización de cuenta bancaria
 */
export const logBankAccountUpdate = (userId, email, ipAddress, userAgent) => {
  writeSecurityLog({
    eventType: SecurityEventType.BANK_ACCOUNT_UPDATE,
    severity: Severity.INFO,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { timestamp: new Date().toISOString() },
  });
};

/**
 * Log de exceso de rate limit
 */
export const logRateLimitExceeded = (ipAddress, userAgent, endpoint) => {
  writeSecurityLog({
    eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
    severity: Severity.WARNING,
    ipAddress,
    userAgent,
    details: { endpoint, timestamp: new Date().toISOString() },
  });
};

/**
 * Log de actividad sospechosa
 */
export const logSuspiciousActivity = (userId, email, ipAddress, userAgent, details) => {
  writeSecurityLog({
    eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
    severity: Severity.CRITICAL,
    userId,
    email,
    ipAddress,
    userAgent,
    details: { ...details, timestamp: new Date().toISOString() },
  });
};

/**
 * Log de encriptación de datos
 */
export const logDataEncryption = (dataType, userId) => {
  writeSecurityLog({
    eventType: SecurityEventType.DATA_ENCRYPTION,
    severity: Severity.INFO,
    userId,
    details: { dataType, timestamp: new Date().toISOString() },
  });
};

/**
 * Log de desencriptación de datos
 */
export const logDataDecryption = (dataType, userId) => {
  writeSecurityLog({
    eventType: SecurityEventType.DATA_DECRYPTION,
    severity: Severity.INFO,
    userId,
    details: { dataType, timestamp: new Date().toISOString() },
  });
};

export default {
  SecurityEventType,
  Severity,
  logLoginSuccess,
  logLoginFailure,
  logRegisterSuccess,
  logRegisterFailure,
  logPasswordChange,
  logPasswordResetRequest,
  logPasswordResetSuccess,
  logEmailVerification,
  logBankAccountUpdate,
  logRateLimitExceeded,
  logSuspiciousActivity,
  logDataEncryption,
  logDataDecryption,
};
