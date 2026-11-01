import prisma from "../lib/prisma.js";
import { creditBalance } from "./balanceService.js";
import {
  packForProductId,
  totalCreditsForPack,
  IAP_CREDIT_PACKS,
} from "../constants/iapProducts.js";

/**
 * Verify store purchase and credit user (idempotent on storeTransactionId).
 *
 * Production: set APPLE_IAP_SHARED_SECRET / Google Play service account.
 * Soft-launch without store creds: IAP_DEV_ACCEPT=true (non-production only)
 * accepts a client-declared transactionId after basic checks.
 */
export async function verifyAndCreditIap({
  userId,
  store,
  productId,
  storeTransactionId,
  receiptData,
}) {
  const storeNorm = String(store || "").toUpperCase();
  if (storeNorm !== "APPLE" && storeNorm !== "GOOGLE") {
    throw Object.assign(new Error("store debe ser APPLE o GOOGLE"), {
      status: 400,
    });
  }

  const pack = packForProductId(productId);
  if (!pack) {
    throw Object.assign(new Error("Producto IAP desconocido"), { status: 400 });
  }

  const txId = String(storeTransactionId || "").trim();
  if (!txId || txId.length < 6) {
    throw Object.assign(new Error("storeTransactionId inválido"), {
      status: 400,
    });
  }

  const existing = await prisma.iapPurchase.findUnique({
    where: { storeTransactionId: txId },
  });
  if (existing?.status === "CREDITED") {
    return {
      alreadyCredited: true,
      creditsGranted: existing.creditsGranted,
      purchaseId: existing.id,
    };
  }

  const verified = await verifyWithStore({
    store: storeNorm,
    productId,
    storeTransactionId: txId,
    receiptData,
  });
  if (!verified.ok) {
    await prisma.iapPurchase.upsert({
      where: { storeTransactionId: txId },
      create: {
        userId: Number(userId),
        store: storeNorm,
        productId,
        storeTransactionId: txId,
        creditsGranted: 0,
        status: "FAILED",
        rawReceipt: receiptData ? String(receiptData).slice(0, 8000) : null,
        failureReason: verified.reason || "verification_failed",
      },
      update: {
        status: "FAILED",
        failureReason: verified.reason || "verification_failed",
      },
    });
    throw Object.assign(
      new Error(verified.reason || "No se pudo verificar la compra"),
      { status: 400 },
    );
  }

  const credits = totalCreditsForPack(pack);

  return prisma.$transaction(async (tx) => {
    const row = await tx.iapPurchase.upsert({
      where: { storeTransactionId: txId },
      create: {
        userId: Number(userId),
        store: storeNorm,
        productId,
        storeTransactionId: txId,
        creditsGranted: credits,
        status: "PENDING",
        rawReceipt: receiptData ? String(receiptData).slice(0, 8000) : null,
      },
      update: {},
    });

    if (row.status === "CREDITED") {
      return {
        alreadyCredited: true,
        creditsGranted: row.creditsGranted,
        purchaseId: row.id,
      };
    }

    await creditBalance(
      userId,
      credits,
      { type: "BANK_TO_CREDITS", currency: "EUR" },
      tx,
    );

    const updated = await tx.iapPurchase.update({
      where: { id: row.id },
      data: {
        status: "CREDITED",
        creditsGranted: credits,
        creditedAt: new Date(),
        failureReason: null,
      },
    });

    return {
      alreadyCredited: false,
      creditsGranted: credits,
      purchaseId: updated.id,
      productId,
    };
  });
}

async function verifyWithStore({
  store,
  productId,
  storeTransactionId,
  receiptData,
}) {
  const allowDev =
    process.env.IAP_DEV_ACCEPT === "true" ||
    process.env.IAP_DEV_ACCEPT === "1";
  const isProd = process.env.NODE_ENV === "production";

  if (allowDev && !isProd) {
    return { ok: true, reason: "dev_accept" };
  }

  if (store === "APPLE") {
    return verifyApple({ productId, storeTransactionId, receiptData });
  }
  return verifyGoogle({ productId, storeTransactionId, receiptData });
}

/**
 * Apple verifyReceipt (legacy shared secret). Prefer App Store Server API later.
 */
async function verifyApple({ productId, storeTransactionId, receiptData }) {
  const secret = process.env.APPLE_IAP_SHARED_SECRET;
  if (!secret) {
    return {
      ok: false,
      reason:
        "APPLE_IAP_SHARED_SECRET no configurado. Configura IAP en App Store Connect o usa IAP_DEV_ACCEPT en desarrollo.",
    };
  }
  if (!receiptData) {
    return { ok: false, reason: "Falta receiptData de Apple" };
  }

  const endpoints = [
    "https://buy.itunes.apple.com/verifyReceipt",
    "https://sandbox.itunes.apple.com/verifyReceipt",
  ];

  let lastErr = "apple_verify_failed";
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "receipt-data": receiptData,
          password: secret,
          "exclude-old-transactions": true,
        }),
      });
      const json = await res.json();
      // 21007 = sandbox receipt sent to production
      if (json.status === 21007) continue;
      if (json.status !== 0) {
        lastErr = `apple_status_${json.status}`;
        continue;
      }
      const items = [
        ...(json.latest_receipt_info || []),
        ...(json.receipt?.in_app || []),
      ];
      const match = items.find(
        (it) =>
          String(it.product_id) === String(productId) &&
          (String(it.transaction_id) === String(storeTransactionId) ||
            String(it.original_transaction_id) === String(storeTransactionId)),
      );
      if (match) return { ok: true };
      lastErr = "apple_transaction_not_found";
    } catch (e) {
      lastErr = e?.message || "apple_network_error";
    }
  }
  return { ok: false, reason: lastErr };
}

/**
 * Google Play: requires service account + package name.
 * Soft-launch: return clear config error until credentials exist.
 */
async function verifyGoogle({ productId, storeTransactionId, receiptData }) {
  const packageName =
    process.env.GOOGLE_PLAY_PACKAGE_NAME || "com.quilax.app";
  if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
    return {
      ok: false,
      reason:
        "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no configurado. Configura Play Console o IAP_DEV_ACCEPT en desarrollo.",
    };
  }
  // Full Google Play Developer API verification can be wired when the JSON key is present.
  // For now require purchase token in receiptData and accept only with IAP_DEV_ACCEPT or future API.
  if (!receiptData) {
    return { ok: false, reason: "Falta purchaseToken (receiptData) de Google" };
  }
  void productId;
  void storeTransactionId;
  void packageName;
  return {
    ok: false,
    reason:
      "Verificación Google Play API pendiente de credenciales. Usa IAP_DEV_ACCEPT=true en desarrollo.",
  };
}

export function listIapPackages() {
  return IAP_CREDIT_PACKS.map((p) => ({
    productId: p.productId,
    credits: p.credits,
    bonus: p.bonus || 0,
    totalCredits: totalCreditsForPack(p),
    label: p.label,
  }));
}
