import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const EMAIL_TIMEOUT_MS = Number.parseInt(process.env.EMAIL_TIMEOUT_MS || '20000', 10);
const skipSmtp =
  process.env.SKIP_EMAIL === 'true' ||
  process.env.SKIP_EMAIL === '1';

function getBrevoApiKey() {
  return (
    process.env.BREVO_API_KEY ||
    process.env.EMAIL_API_KEY ||
    process.env.SENDINBLUE_API_KEY ||
    ''
  ).trim();
}

/** Brevo-friendly SMTP defaults. */
function getSmtpConfig(overrides = {}) {
  const port =
    overrides.port ??
    (Number.parseInt(process.env.EMAIL_PORT || '587', 10) || 587);
  const secure =
    overrides.secure ??
    (process.env.EMAIL_SECURE === 'true' ||
      process.env.EMAIL_SECURE === '1' ||
      port === 465);
  return {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port,
    secure,
    requireTLS: !secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: EMAIL_TIMEOUT_MS,
    greetingTimeout: EMAIL_TIMEOUT_MS,
    socketTimeout: EMAIL_TIMEOUT_MS,
    tls: { minVersion: 'TLSv1.2' },
  };
}

function getFromAddress() {
  return process.env.EMAIL_FROM || 'Quilax <noreply@appquilax.com>';
}

/** Parse `Name <email@x>` or bare email → { name, email } for Brevo API. */
function parseSender(from) {
  const s = String(from || '').trim();
  const m = s.match(/^(.*)<([^>]+)>$/);
  if (m) {
    return { name: m[1].trim().replace(/^"|"$/g, '') || 'Quilax', email: m[2].trim() };
  }
  return { name: 'Quilax', email: s };
}

let transporter = null;
let transporterKey = '';

function getTransporter(overrides = {}) {
  const cfg = getSmtpConfig(overrides);
  const key = `${cfg.host}:${cfg.port}:${cfg.secure}`;
  if (transporter && transporterKey === key) return transporter;
  transporter = nodemailer.createTransport(cfg);
  transporterKey = key;
  return transporter;
}

export function resetEmailTransport() {
  transporter = null;
  transporterKey = '';
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
    configured: Boolean(
      getBrevoApiKey() || (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    ),
    apiConfigured: Boolean(getBrevoApiKey()),
    smtpConfigured: Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    requireTLS: cfg.requireTLS,
    fromSet: Boolean(process.env.EMAIL_FROM),
    fromPreview: String(getFromAddress()).replace(/@[^>\s]+/, '@***'),
  };
}

function buildHtml({ title, intro, code }) {
  return `
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
  `;
}

/** HTTPS API — works on Render when outbound SMTP:587 times out. */
async function sendViaBrevoApi({ to, subject, html }) {
  const apiKey = getBrevoApiKey();
  if (!apiKey) return null;

  const sender = parseSender(getFromAddress());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('❌ Brevo API error:', res.status, JSON.stringify(body).slice(0, 300));
      return {
        ok: false,
        delivered: false,
        reason: `brevo_api_${res.status}`,
        detail: body?.message || body?.code,
      };
    }
    console.log(`✅ Brevo API email → ${to} id=${body?.messageId || 'n/a'}`);
    return { ok: true, delivered: true, messageId: body?.messageId, via: 'brevo_api' };
  } catch (error) {
    console.error('❌ Brevo API send failed:', error?.message || error);
    return {
      ok: false,
      delivered: false,
      reason: error?.name === 'AbortError' ? 'brevo_api_timeout' : error?.message || 'brevo_api_failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function sendViaSmtp({ to, subject, html }, overrides = {}) {
  const info = await withTimeout(
    getTransporter(overrides).sendMail({
      from: getFromAddress(),
      to,
      subject,
      html,
    }),
    EMAIL_TIMEOUT_MS,
    subject,
  );
  console.log(`✅ SMTP email → ${to} (${subject}) id=${info?.messageId || 'n/a'}`);
  return { ok: true, delivered: true, messageId: info?.messageId, via: 'smtp' };
}

async function sendTemplatedMail({ to, subject, title, intro, code }) {
  if (skipSmtp) {
    console.log(`📧 [SKIP_EMAIL] ${subject} → ${to}: ${code}`);
    return { ok: true, delivered: false, skipped: true };
  }

  const html = buildHtml({ title, intro, code });
  const hasApi = Boolean(getBrevoApiKey());
  const hasSmtp = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

  if (!hasApi && !hasSmtp) {
    console.error('❌ Ni BREVO_API_KEY ni EMAIL_USER/PASSWORD configurados');
    console.log(`📧 [FALLBACK] ${subject} → ${to}: ${code}`);
    return { ok: true, delivered: false, reason: 'missing_credentials' };
  }

  // Prefer HTTPS API on cloud (Render often times out SMTP:587).
  if (hasApi) {
    const apiResult = await sendViaBrevoApi({ to, subject, html });
    if (apiResult?.delivered) return apiResult;
    console.warn('⚠️ Brevo API falló; intento SMTP…', apiResult?.reason);
  }

  if (!hasSmtp) {
    console.log(`📧 [FALLBACK] ${subject} → ${to}: ${code}`);
    return { ok: true, delivered: false, reason: 'smtp_missing_after_api_fail' };
  }

  // SMTP attempts: configured port, then 465 SSL
  const attempts = [
    {},
    { port: 465, secure: true },
  ];
  let lastReason = 'send_failed';
  for (const overrides of attempts) {
    try {
      resetEmailTransport();
      return await sendViaSmtp({ to, subject, html }, overrides);
    } catch (error) {
      lastReason = error?.code || error?.message || 'send_failed';
      console.error(`❌ SMTP fail port=${overrides.port || process.env.EMAIL_PORT || 587}:`, lastReason);
      if (error?.response) console.error('SMTP response:', String(error.response).slice(0, 300));
      resetEmailTransport();
    }
  }

  console.log(`📧 [FALLBACK] ${subject} → ${to}: ${code}`);
  return { ok: true, delivered: false, reason: lastReason };
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
  if (getBrevoApiKey()) {
    // Cheap reachability check for API key
    try {
      const res = await fetch('https://api.brevo.com/v3/account', {
        headers: { accept: 'application/json', 'api-key': getBrevoApiKey() },
      });
      const ok = res.ok;
      console.log(ok ? '✅ Brevo API key OK' : `❌ Brevo API key HTTP ${res.status}`);
      return ok;
    } catch (e) {
      console.error('❌ Brevo API verify failed:', e?.message || e);
      return false;
    }
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER/EMAIL_PASSWORD no configurados');
    return false;
  }
  try {
    await withTimeout(getTransporter().verify(), EMAIL_TIMEOUT_MS, 'verifyEmailConfig');
    console.log('✅ SMTP verificado:', JSON.stringify(getEmailStatus()));
    return true;
  } catch (error) {
    console.error('❌ SMTP verify failed:', error?.message || error);
    resetEmailTransport();
    try {
      await withTimeout(
        getTransporter({ port: 465, secure: true }).verify(),
        EMAIL_TIMEOUT_MS,
        'verifyEmailConfig-465',
      );
      console.log('✅ SMTP 465 verificado');
      return true;
    } catch (err2) {
      console.error('❌ SMTP 465 verify failed:', err2?.message || err2);
      resetEmailTransport();
      return false;
    }
  }
};

export const sendSmtpDiagnostic = async (to) => {
  if (skipSmtp) return { ok: true, delivered: false, skipped: true };
  const html = '<p>Diagnostic from Quilax production API. If you received this, email delivery works.</p>';
  const subject = `Quilax SMTP OK ${new Date().toISOString()}`;
  if (getBrevoApiKey()) {
    const api = await sendViaBrevoApi({ to, subject, html });
    if (api) return api;
  }
  try {
    return await sendViaSmtp({ to, subject, html });
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
