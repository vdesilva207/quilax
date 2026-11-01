import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { creditBalance } from "./balanceService.js";

const MIN_CREDITS = 1;
const MAX_CREDITS = 10000;
const EXPIRE_HOURS = Number(process.env.MANUAL_DEPOSIT_EXPIRE_HOURS || 72);

function platformBankDetails() {
  const iban = String(process.env.MANUAL_DEPOSIT_IBAN || "").trim();
  const accountName = String(
    process.env.MANUAL_DEPOSIT_ACCOUNT_NAME || "Quilax",
  ).trim();
  const bankName = String(process.env.MANUAL_DEPOSIT_BANK_NAME || "").trim();
  const bic = String(process.env.MANUAL_DEPOSIT_BIC || "").trim();
  if (!iban) {
    const err = new Error(
      "Depósitos por transferencia no configurados (falta MANUAL_DEPOSIT_IBAN)",
    );
    err.status = 503;
    throw err;
  }
  return { iban, accountName, bankName: bankName || null, bic: bic || null };
}

function makeReferenceCode(userId) {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `QLX-${userId}-${rand}`;
}

/**
 * Create a pending manual bank deposit instruction for the user.
 */
export async function createManualDeposit(userId, creditsRequested, userNote) {
  const credits = Math.floor(Number(creditsRequested));
  if (!Number.isFinite(credits) || credits < MIN_CREDITS) {
    throw Object.assign(new Error(`Mínimo ${MIN_CREDITS} crédito`), {
      status: 400,
    });
  }
  if (credits > MAX_CREDITS) {
    throw Object.assign(new Error(`Máximo ${MAX_CREDITS} créditos`), {
      status: 400,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, currency: true, isBanned: true },
  });
  if (!user) throw Object.assign(new Error("Usuario no encontrado"), { status: 404 });
  if (user.isBanned) {
    throw Object.assign(new Error("Tu cuenta está suspendida"), { status: 403 });
  }

  const bank = platformBankDetails();
  const currency = (user.currency || "EUR").toUpperCase();
  // Soft-launch: 1 credit ≈ 1 major unit of user currency
  const amountExpected = credits;

  let referenceCode = makeReferenceCode(user.id);
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.manualBankDeposit.findUnique({
      where: { referenceCode },
    });
    if (!clash) break;
    referenceCode = makeReferenceCode(user.id);
  }

  const expiresAt = new Date(Date.now() + EXPIRE_HOURS * 60 * 60 * 1000);

  const deposit = await prisma.manualBankDeposit.create({
    data: {
      userId: user.id,
      referenceCode,
      creditsRequested: credits,
      amountExpected,
      currency,
      status: "PENDING",
      userNote: userNote ? String(userNote).slice(0, 500) : null,
      expiresAt,
    },
  });

  return {
    deposit: {
      id: deposit.id,
      referenceCode: deposit.referenceCode,
      creditsRequested: deposit.creditsRequested,
      amountExpected: deposit.amountExpected,
      currency: deposit.currency,
      status: deposit.status,
      expiresAt: deposit.expiresAt,
      createdAt: deposit.createdAt,
    },
    bank,
    instructions: {
      amount: amountExpected,
      currency,
      referenceMustMatch: referenceCode,
      expireHours: EXPIRE_HOURS,
    },
  };
}

export async function listMyManualDeposits(userId) {
  const rows = await prisma.manualBankDeposit.findMany({
    where: { userId: Number(userId) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows;
}

export async function cancelManualDeposit(userId, depositId) {
  const row = await prisma.manualBankDeposit.findFirst({
    where: { id: Number(depositId), userId: Number(userId) },
  });
  if (!row) throw Object.assign(new Error("Depósito no encontrado"), { status: 404 });
  if (row.status !== "PENDING") {
    throw Object.assign(new Error("Solo se pueden cancelar pendientes"), {
      status: 400,
    });
  }
  return prisma.manualBankDeposit.update({
    where: { id: row.id },
    data: { status: "CANCELLED" },
  });
}

export async function listAdminManualDeposits(status = "PENDING") {
  const where =
    status && status !== "ALL"
      ? { status: String(status).toUpperCase() }
      : {};
  return prisma.manualBankDeposit.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: {
        select: { id: true, email: true, fullName: true, username: true },
      },
    },
  });
}

export async function confirmManualDeposit(depositId, adminId, adminNotes) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.manualBankDeposit.findUnique({
      where: { id: Number(depositId) },
    });
    if (!row) throw Object.assign(new Error("Depósito no encontrado"), { status: 404 });
    if (row.status !== "PENDING") {
      throw Object.assign(new Error(`Estado actual: ${row.status}`), {
        status: 400,
      });
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await tx.manualBankDeposit.update({
        where: { id: row.id },
        data: { status: "EXPIRED" },
      });
      throw Object.assign(new Error("Este depósito ha caducado"), { status: 400 });
    }

    await creditBalance(
      row.userId,
      row.creditsRequested,
      {
        type: "BANK_TO_CREDITS",
        currency: row.currency || "EUR",
      },
      tx,
    );

    return tx.manualBankDeposit.update({
      where: { id: row.id },
      data: {
        status: "CONFIRMED",
        confirmedByAdminId: adminId ? Number(adminId) : null,
        confirmedAt: new Date(),
        adminNotes: adminNotes ? String(adminNotes).slice(0, 1000) : null,
      },
    });
  });
}

export async function rejectManualDeposit(depositId, adminId, adminNotes) {
  const row = await prisma.manualBankDeposit.findUnique({
    where: { id: Number(depositId) },
  });
  if (!row) throw Object.assign(new Error("Depósito no encontrado"), { status: 404 });
  if (row.status !== "PENDING") {
    throw Object.assign(new Error(`Estado actual: ${row.status}`), {
      status: 400,
    });
  }
  return prisma.manualBankDeposit.update({
    where: { id: row.id },
    data: {
      status: "REJECTED",
      confirmedByAdminId: adminId ? Number(adminId) : null,
      confirmedAt: new Date(),
      adminNotes: adminNotes ? String(adminNotes).slice(0, 1000) : null,
    },
  });
}

export function getManualDepositBankPublic() {
  try {
    return { configured: true, bank: platformBankDetails() };
  } catch {
    return { configured: false, bank: null };
  }
}
