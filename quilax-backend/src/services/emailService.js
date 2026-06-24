import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Cargar variables de entorno
dotenv.config();

// Configurar el transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Generar código de verificación de 6 dígitos
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Enviar email de verificación con código de 6 dígitos
 */
export const sendVerificationEmail = async (email, code) => {
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

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de verificación enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email de verificación:', error);
    // Fallback para desarrollo: mostrar código en consola
    console.log(`📧 [MODO DESARROLLO] Código de verificación para ${email}: ${code}`);
    return true; // Devolver true para no bloquear el flujo en desarrollo
  }
};

/**
 * Enviar email de reset de contraseña
 */
export const sendPasswordResetEmail = async (email, code) => {
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

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de reset de contraseña enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email de reset de contraseña:', error);
    // Fallback para desarrollo: mostrar código en consola
    console.log(`📧 [MODO DESARROLLO] Código de reset de contraseña para ${email}: ${code}`);
    return true; // Devolver true para no bloquear el flujo en desarrollo
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
