import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const EMAIL_TIMEOUT_MS = Number.parseInt(process.env.EMAIL_TIMEOUT_MS || '25000', 10);
const skipSmtp =
  process.env.SKIP_EMAIL === 'true' ||
  process.env.SKIP_EMAIL === '1';

/** Brevo-friendly defaults (prod used to fall back to Gmail and silently fail). */
function getSmtpConfig() {
  const port = Number.parseInt(process.env.EMAIL_PORT || '587', 10) || 587;
  const secure =
    process.env.EMAIL_SECURE === 'true' ||
    process.env.EMAIL_SECURE === '1' ||
    port === 465;
  return {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port,
    secure,
    // STARTTLS on 587 — required by Brevo; without this sends often fail/hang on Render
    requireTLS: !secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
    tls: {
      minVersion: 'TLSv1.2',
    },
  };
}

function getFromAddress() {
  return (
    process.env.EMAIL_FROM ||
    'Quilax <noreply@appquilax.com>'
  );
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getSmtpConfig();
  transporter = nodemailer.createTransport(cfg);
  return transporter;
}

/** Reset cached transport (e.g. after env change / failed connection). */
export function resetEmailTransport() {
  transporter = null;
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export function getEmailStatus() {
  const cfg = getSmtpConfig();
  return {
    skipSmtp,
    configured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: cfg.requireTLS,
    fromSet: Boolean(process.env.EMAIL_FROM),
    fromPreview: String(getFromAddress()).replace(/@[^>\s]+/, '@***'),
  };
}

async function sendTemplatedMail({ to, subject, title, intro, code }) {
  if (skipSmtp) {
    console.log(`📧 [SKIP_EMAIL] ${subject} → ${to}: ${code}`);
    return { ok: true, delivered: false, skipped: true };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER/EMAIL_PASSWORD no configurados');
    console.log(`📧 [FALLBACK] ${subject} → ${to}: ${code}`);
    return { ok: true, delivered: false, reason: 'missing_credentials' };
  }

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Quilax</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">${title}</h2>
          <p style="color: #666; line-height: 1.6;">${intro}</p>
          <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #667eea;">
            <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
          </div>
          <p style="color: #666; line-height: 1.6;">Este código expirará en 15 minutos. Si no lo pediste, ignora este email.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Email automático de Quilax — no respondas.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await withTimeout(
      getTransporter().sendMail(mailOptions),
      EMAIL_TIMEOUT_MS,
      subject,
    );
    console.log(`✅ Email enviado a ${to} (${subject}) id=${info?.messageId || 'n/a'}`);
    return { ok: true, delivered: true, messageId: info?.messageId };
  } catch (error) {
    console.error(`❌ Error enviando email (${subject}):`, error?.message || error);
    if (error?.code) console.error('SMTP code:', error.code);
    if (error?.response) console.error('SMTP response:', String(error.response).slice(0, 300));
    // Drop cached transport — next send gets a fresh connection
    resetEmailTransport();
    console.log(`📧 [FALLBACK] ${subject} → ${to}: ${code}`);
    return {
      ok: true,
      delivered: false,
      reason: error?.code || error?.message || 'send_failed',
    };
  }
}

export const sendVerificationEmail = async (email, code) => {
  return sendTemplatedMail({
    to: email,
    subject: 'Código de verificación - Quilax',
    title: 'Verifica tu email',
    intro:
      'Gracias por registrarte en Quilax. Para completar tu registro, utiliza el siguiente código de verificación:',
    code,
  });
};

export const sendPasswordResetEmail = async (email, code) => {
  return sendTemplatedMail({
    to: email,
    subject: 'Código de reset de contraseña - Quilax',
    title: 'Reset de contraseña',
    intro:
      'Has solicitado resetear tu contraseña. Utiliza el siguiente código para completar el proceso:',
    code,
  });
};

export const verifyEmailConfig = async () => {
  if (skipSmtp) {
    console.log('⚠️ SKIP_EMAIL activo — SMTP omitido');
    return false;
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER/EMAIL_PASSWORD no configurados');
    return false;
  }
  try {
    await withTimeout(getTransporter().verify(), EMAIL_TIMEOUT_MS, 'verifyEmailConfig');
    console.log('✅ Configuración de email verificada:', JSON.stringify(getEmailStatus()));
    return true;
  } catch (error) {
    console.error('❌ Error verificando configuración de email:', error?.message || error);
    resetEmailTransport();
    // One retry with fresh transport
    try {
      await withTimeout(getTransporter().verify(), EMAIL_TIMEOUT_MS, 'verifyEmailConfig-retry');
      console.log('✅ Email verify OK en reintento');
      return true;
    } catch (err2) {
      console.error('❌ Email verify retry failed:', err2?.message || err2);
      resetEmailTransport();
      return false;
    }
  }
};

/**
 * Send a plain diagnostic email (ops). Returns delivery result.
 */
export const sendSmtpDiagnostic = async (to) => {
  if (skipSmtp) return { ok: true, delivered: false, skipped: true };
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return { ok: false, delivered: false, reason: 'missing_credentials' };
  }
  try {
    const info = await withTimeout(
      getTransporter().sendMail({
        from: getFromAddress(),
        to,
        subject: `Quilax SMTP OK ${new Date().toISOString()}`,
        text: 'Diagnostic from production API. If you received this, Render→Brevo works.',
      }),
      EMAIL_TIMEOUT_MS,
      'sendSmtpDiagnostic',
    );
    return { ok: true, delivered: true, messageId: info?.messageId };
  } catch (error) {
    resetEmailTransport();
    return {
      ok: false,
      delivered: false,
      reason: error?.code || error?.message || 'send_failed',
      smtpResponse: error?.response ? String(error.response).slice(0, 200) : undefined,
    };
  }
};

export default {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConfig,
  getEmailStatus,
  resetEmailTransport,
  sendSmtpDiagnostic,
};
