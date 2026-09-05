import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Cargar variables de entorno
dotenv.config();

// Tiempo generoso: el registro ya no espera al SMTP (fire-and-forget).
const EMAIL_TIMEOUT_MS = Number.parseInt(process.env.EMAIL_TIMEOUT_MS || '20000', 10);
const skipSmtp =
  process.env.SKIP_EMAIL === 'true' ||
  process.env.SKIP_EMAIL === '1';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: EMAIL_TIMEOUT_MS,
  greetingTimeout: EMAIL_TIMEOUT_MS,
  socketTimeout: EMAIL_TIMEOUT_MS,
});

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

/**
 * Generar código de verificación de 6 dígitos
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Enviar email de verificación.
 * @returns {{ ok: boolean, delivered: boolean }}
 */
export const sendVerificationEmail = async (email, code) => {
  if (skipSmtp) {
    console.log(`📧 [SKIP_EMAIL] Código de verificación para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ EMAIL_USER/EMAIL_PASSWORD no configurados');
    console.log(`📧 [FALLBACK] Código de verificación para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Código de verificación - Quilax',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Quilax</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Verifica tu email</h2>
            <p style="color: #666; line-height: 1.6;">Gracias por registrarte en Quilax. Para completar tu registro, utiliza el siguiente código de verificación:</p>
            
            <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #667eea;">
              <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
            </div>
            
            <p style="color: #666; line-height: 1.6;">Este código expirará en 15 minutos. Si no solicitaste este código, puedes ignorar este email.</p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">Este es un email automático, por favor no respondas.</p>
          </div>
        </div>
      `,
    };

    await withTimeout(transporter.sendMail(mailOptions), EMAIL_TIMEOUT_MS, 'sendVerificationEmail');
    console.log(`✅ Email de verificación enviado a ${email}`);
    return { ok: true, delivered: true };
  } catch (error) {
    console.error('❌ Error enviando email de verificación:', error?.message || error);
    console.log(`📧 [FALLBACK] Código de verificación para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }
};

/**
 * Enviar email de reset de contraseña
 */
export const sendPasswordResetEmail = async (email, code) => {
  if (skipSmtp) {
    console.log(`📧 [SKIP_EMAIL] Código de reset para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log(`📧 [FALLBACK] Código de reset para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Código de reset de contraseña - Quilax',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 32px;">Quilax</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #333; margin-top: 0;">Reset de contraseña</h2>
            <p style="color: #666; line-height: 1.6;">Has solicitado resetear tu contraseña. Utiliza el siguiente código para completar el proceso:</p>
            
            <div style="background: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #667eea;">
              <span style="font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 5px;">${code}</span>
            </div>
            
            <p style="color: #666; line-height: 1.6;">Este código expirará en 15 minutos. Si no solicitaste este cambio, puedes ignorar este email.</p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">Este es un email automático, por favor no respondas.</p>
          </div>
        </div>
      `,
    };

    await withTimeout(transporter.sendMail(mailOptions), EMAIL_TIMEOUT_MS, 'sendPasswordResetEmail');
    console.log(`✅ Email de reset de contraseña enviado a ${email}`);
    return { ok: true, delivered: true };
  } catch (error) {
    console.error('❌ Error enviando email de reset de contraseña:', error?.message || error);
    console.log(`📧 [FALLBACK] Código de reset de contraseña para ${email}: ${code}`);
    return { ok: true, delivered: false };
  }
};

/**
 * Verificar si el transportador de email está configurado correctamente
 */
export const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Configuración de email verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error verificando configuración de email:', error);
    return false;
  }
};

export default {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifyEmailConfig,
};
