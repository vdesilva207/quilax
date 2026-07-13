import prisma from "../lib/prisma.js";
import { CREDIT_TO_EUR } from "../constants/money.js";

export async function getBalance(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { balance: true, currency: true },
  });
  if (!user) throw new Error("Usuario no encontrado");
  return user;
}

export async function assertSufficientBalance(userId, amount) {
  const user = await getBalance(userId);
  if (user.balance < amount) {
    const err = new Error("Saldo insuficiente");
    err.status = 400;
    throw err;
  }
  return user;
}

export async function creditBalance(userId, amount, meta = {}, tx = prisma) {
  const value = Number(amount);
  if (value <= 0) throw new Error("Importe inválido");

  await tx.user.update({
    where: { id: Number(userId) },
    data: { balance: { increment: value } },
  });

  if (meta.type) {
    await tx.transaction.create({
      data: {
        userId: Number(userId),
        amount: value,
        currency: meta.currency || "CREDIT",
        type: meta.type,
        quizId: meta.quizId ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });
  }

  return getBalance(userId);
}

export async function debitBalance(userId, amount, meta = {}, tx = prisma) {
  const value = Number(amount);
  if (value <= 0) throw new Error("Importe inválido");

  const user = await tx.user.findUnique({
    where: { id: Number(userId) },
    select: { balance: true },
  });

  if (!user || user.balance < value) {
    const err = new Error("Saldo insuficiente");
    err.status = 400;
    throw err;
  }

  await tx.user.update({
    where: { id: Number(userId) },
    data: { balance: { decrement: value } },
  });

  if (meta.type) {
    await tx.transaction.create({
      data: {
        userId: Number(userId),
        amount: value,
        currency: meta.currency || "CREDIT",
        type: meta.type,
        quizId: meta.quizId ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });
  }

  return getBalance(userId);
}

export function creditsToEur(credits) {
  return Number(credits) * CREDIT_TO_EUR;
}

export default {
  getBalance,
  assertSufficientBalance,
  creditBalance,
  debitBalance,
  creditsToEur,
};
