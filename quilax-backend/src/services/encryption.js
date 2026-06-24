import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'quilax_encryption_key_2024_change_in_production';

/**
 * Encriptar texto usando AES
 */
export const encrypt = (text) => {
  if (!text) return null;
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting data:', error);
    return null;
  }
};

/**
 * Desencriptar texto usando AES
 */
export const decrypt = (encryptedText) => {
  if (!encryptedText) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Error decrypting data:', error);
    return null;
  }
};

/**
 * Encriptar IBAN (mascarar parte del número)
 */
export const encryptIBAN = (iban) => {
  if (!iban) return null;
  try {
    // Mascarar IBAN: mostrar solo los últimos 4 caracteres
    const masked = iban.replace(/.(?=.{4})/g, '*');
    const encrypted = encrypt(iban);
    return {
      encrypted,
      masked,
    };
  } catch (error) {
    console.error('Error encrypting IBAN:', error);
    return null;
  }
};

/**
 * Encriptar nombre del titular
 */
export const encryptAccountName = (name) => {
  if (!name) return null;
  try {
    // Mascarar nombre: mostrar solo la primera letra
    const masked = name.replace(/(\w)(\w*)/g, (g, first, rest) => first + '*'.repeat(rest.length));
    const encrypted = encrypt(name);
    return {
      encrypted,
      masked,
    };
  } catch (error) {
    console.error('Error encrypting account name:', error);
    return null;
  }
};
