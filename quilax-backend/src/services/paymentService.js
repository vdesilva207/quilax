import Stripe from 'stripe';
import prisma from '../lib/prisma.js';
import { getIO } from '../socket.js';
import { encrypt } from './encryption.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Configuración de precios (1 crédito = 1 EUR)
const CREDIT_PRICE_EUROS = 1; // 1 EUR por crédito
const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
const STRIPE_FEE_FIXED = 0.30; // 0.30 EUR

// Paquetes de créditos disponibles
const CREDIT_PACKAGES = [
  { credits: 10, bonus: 0, label: "10 Créditos" },
  { credits: 25, bonus: 2, label: "25 Créditos (+2 gratis)" },
  { credits: 50, bonus: 5, label: "50 Créditos (+5 gratis)" },
  { credits: 100, bonus: 15, label: "100 Créditos (+15 gratis)" },
  { credits: 200, bonus: 40, label: "200 Créditos (+40 gratis)" },
];

/*
====================================
COMPRAR CRÉDITOS CON STRIPE
====================================
*/
export async function createPaymentIntent(userId, credits) {
  try {
    // Validar usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validar paquete de créditos
    const packageInfo = CREDIT_PACKAGES.find(p => p.credits === credits);
    if (!packageInfo) {
      throw new Error('Paquete de créditos no válido');
    }

    // Calcular total con bonus
    const totalCredits = credits + packageInfo.bonus;
    const totalAmount = credits * CREDIT_PRICE_EUROS * 100; // Convertir a centavos

    // Crear cliente Stripe
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: userId.toString()
      }
    });

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'eur',
      customer: customer.id,
      metadata: {
        userId: userId.toString(),
        credits: credits.toString(),
        totalCredits: totalCredits.toString(),
        bonus: packageInfo.bonus.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    // Guardar registro de pago en BD
    await prisma.payment.create({
      data: {
        userId,
        amount: totalAmount,
        currency: 'EUR',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        creditsPurchased: totalCredits,
        paymentType: 'CREDIT_PURCHASE'
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      credits: totalCredits,
      packageInfo
    };

  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw new Error(`Error al crear pago: ${error.message}`);
  }
}

/*
====================================
PROCESAR WEBHOOK DE STRIPE
====================================
*/
export async function processStripeWebhook(event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'payment_intent.canceled':
        await handlePaymentCancellation(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw error;
  }
}

async function handlePaymentSuccess(paymentIntent) {
  const { userId, credits, totalCredits } = paymentIntent.metadata;
  const userIdNum = parseInt(userId);

  // Actualizar pago en BD
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntent.id },
    data: {
      status: 'COMPLETED',
      stripeChargeId: paymentIntent.charges.data[0]?.id
    }
  });

  // Añadir créditos al usuario
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userIdNum },
      data: {
        balance: { increment: parseInt(totalCredits) }
      }
    });

    // Registrar transacción
    await tx.transaction.create({
      data: {
        userId: userIdNum,
        type: 'BANK_TO_CREDITS',
        amount: parseInt(totalCredits),
        currency: 'CREDITS',
      }
    });
  });

  // Notificar al usuario
  const io = getIO();
  io.to(`user:${userIdNum}`).emit('payment:success', {
    credits: parseInt(totalCredits),
    message: `¡Has comprado ${totalCredits} créditos con éxito!`
  });

  console.log(`✅ Payment succeeded: User ${userIdNum} bought ${totalCredits} credits`);
}

async function handlePaymentFailure(paymentIntent) {
  const { userId } = paymentIntent.metadata;

  // Actualizar pago en BD
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntent.id },
    data: {
      status: 'FAILED',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed'
    }
  });

  // Notificar al usuario
  const io = getIO();
  io.to(`user:${userId}`).emit('payment:failed', {
    message: 'El pago ha fallado. Por favor, inténtalo de nuevo.'
  });

  console.log(`❌ Payment failed: User ${userId}`);
}

async function handlePaymentCancellation(paymentIntent) {
  const { userId } = paymentIntent.metadata;

  // Actualizar pago en BD
  await prisma.payment.update({
    where: { stripePaymentIntentId: paymentIntent.id },
    data: {
      status: 'CANCELLED'
    }
  });

  console.log(`🚫 Payment cancelled: User ${userId}`);
}

/*
====================================
HISTORIAL DE PAGOS
====================================
*/
export async function getUserPaymentHistory(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        creditsPurchased: true,
        paymentType: true,
        createdAt: true,
        failureReason: true
      }
    }),
    prisma.payment.count({ where: { userId } })
  ]);

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/*
====================================
OBTENER PAQUETES DISPONIBLES
====================================
*/
export function getAvailablePackages() {
  return CREDIT_PACKAGES.map(pkg => ({
    ...pkg,
    totalCredits: pkg.credits + pkg.bonus,
    priceEuros: pkg.credits * CREDIT_PRICE_EUROS,
    savings: pkg.bonus > 0 ? ((pkg.bonus / (pkg.credits + pkg.bonus)) * 100).toFixed(1) : 0
  }));
}

/*
====================================
VERIFICACIÓN BANCARIA
====================================
*/
export async function updateBankAccount(userId, bankData) {
  const { iban, accountName, bic } = bankData;

  // Validar formato IBAN básico
  if (!iban || !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban.replace(/\s/g, '').toUpperCase())) {
    throw new Error('IBAN no válido');
  }

  // Validar nombre del titular
  if (!accountName || accountName.length < 3) {
    throw new Error('Nombre del titular es requerido');
  }

  // Encriptar datos bancarios antes de guardar
  const encryptedIban = encrypt(iban.replace(/\s/g, '').toUpperCase());
  const encryptedAccountName = encrypt(accountName.trim());
  const encryptedBic = bic ? encrypt(bic.trim()) : null;

  // Actualizar datos bancarios con encriptación
  await prisma.user.update({
    where: { id: userId },
    data: {
      bankAccountIban: encryptedIban,
      bankAccountName: encryptedAccountName,
      bankAccountBic: encryptedBic,
      isBankVerified: true // En producción, aquí iría verificación real
    }
  });

  return { message: 'Cuenta bancaria actualizada correctamente' };
}

/*
====================================
VALIDACIÓN DE EDAD
====================================
*/
export async function updateUserAgeVerification(userId, verificationData) {
  const { dateOfBirth, guardianPhotoUrl, verificationVideoUrl } = verificationData;

  // Validar fecha de nacimiento
  if (!dateOfBirth) {
    throw new Error('Fecha de nacimiento requerida');
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  const isOver18 = age >= 18;

  // Actualizar datos de verificación
  await prisma.user.update({
    where: { id: userId },
    data: {
      dateOfBirth: birthDate,
      isOver18,
      guardianPhotoUrl: isOver18 ? null : guardianPhotoUrl,
      verificationVideoUrl
    }
  });

  return {
    isOver18,
    message: isOver18 
      ? 'Verificación de edad completada' 
      : 'Se requiere verificación de tutor para menores de edad'
  };
}

export default {
  createPaymentIntent,
  processStripeWebhook,
  getUserPaymentHistory,
  getAvailablePackages,
  updateBankAccount,
  updateUserAgeVerification
};
