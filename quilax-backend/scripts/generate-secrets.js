#!/usr/bin/env node

const crypto = require('crypto');

/**
 * Generar un secret seguro aleatorio de 32+ caracteres
 */
function generateSecureSecret(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Generar un secret base64 seguro
 */
function generateBase64Secret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generando secrets seguros para producción...\n');

const jwtSecret = generateSecureSecret(32);
const encryptionKey = generateSecureSecret(32);

console.log('📋 Agrega estos valores a tu archivo .env en producción:\n');
console.log('========================================');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log('========================================\n');

console.log('⚠️  IMPORTANTE:');
console.log('   - Guarda estos secrets de forma segura');
console.log('   - No los commits al repositorio');
console.log('   - Usa un secrets manager en producción (AWS Secrets Manager, Vault, etc.)');
console.log('   - Rota estos secrets periódicamente\n');

console.log('✅ Secrets generados exitosamente');