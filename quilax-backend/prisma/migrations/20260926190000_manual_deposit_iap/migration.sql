-- AlterTable
ALTER TABLE "Withdraw" ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "Withdraw" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Withdraw_status_payoutMethod_idx" ON "Withdraw"("status", "payoutMethod");

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ManualDepositStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "IapPurchaseStatus" AS ENUM ('PENDING', 'CREDITED', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ManualBankDeposit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "creditsRequested" INTEGER NOT NULL,
    "amountExpected" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "ManualDepositStatus" NOT NULL DEFAULT 'PENDING',
    "userNote" TEXT,
    "adminNotes" TEXT,
    "confirmedByAdminId" INTEGER,
    "confirmedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManualBankDeposit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ManualBankDeposit_referenceCode_key" ON "ManualBankDeposit"("referenceCode");
CREATE INDEX IF NOT EXISTS "ManualBankDeposit_userId_status_idx" ON "ManualBankDeposit"("userId", "status");
CREATE INDEX IF NOT EXISTS "ManualBankDeposit_status_createdAt_idx" ON "ManualBankDeposit"("status", "createdAt");

CREATE TABLE IF NOT EXISTS "IapPurchase" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "store" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeTransactionId" TEXT NOT NULL,
    "creditsGranted" INTEGER NOT NULL,
    "status" "IapPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "rawReceipt" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditedAt" TIMESTAMP(3),
    CONSTRAINT "IapPurchase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IapPurchase_storeTransactionId_key" ON "IapPurchase"("storeTransactionId");
CREATE INDEX IF NOT EXISTS "IapPurchase_userId_createdAt_idx" ON "IapPurchase"("userId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "ManualBankDeposit" ADD CONSTRAINT "ManualBankDeposit_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "IapPurchase" ADD CONSTRAINT "IapPurchase_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
