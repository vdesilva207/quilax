import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Cargar variables de entorno PRIMERO
dotenv.config();

// Configurar el transportador DESPUÉS de cargar .env
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Script de prueba para verificar configuración de email
async function testEmailConfig() {
  console.log('🔍 Verificando configuración de email...\n');
  console.log('Configuración actual:');
  console.log('- EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('- EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('- EMAIL_USER:', process.env.EMAIL_USER);
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('');
  
  try {
    // Verificar configuración
    await transporter.verify();
    console.log('✅ Configuración de email verificada correctamente');
    
    console.log('\n✅ Configuración válida. Enviando email de prueba...\n');
    
    // Enviar email de prueba
    const testEmail = process.env.TEST_EMAIL || 'hermesdesilvaortiz@gmail.com';
    const testCode = '123456';
    
    console.log(`Enviando email a: ${testEmail}`);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: 'Prueba de email - Quilax',
      text: `Código de prueba: ${testCode}`,
    };
    
    await transporter.sendMail(mailOptions);
    console.log('\n✅ Email de prueba enviado exitosamente');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n❌ Configuración inválida. Revisa las variables de entorno en .env');
  }
}

testEmailConfig().catch(console.error);
