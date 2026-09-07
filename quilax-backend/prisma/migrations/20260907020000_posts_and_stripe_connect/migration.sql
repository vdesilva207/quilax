-- AlterTable: Stripe Connect on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeConnectAccountId" TEXT;

-- Enum: transaction types used by payment/refund flows
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BANK_TO_CREDITS';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_REFUND';

-- CreateTable: Post
CREATE TABLE IF NOT EXISTS "Post" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "text" TEXT,
    "imageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_userId_idx" ON "Post"("userId");
CREATE INDEX IF NOT EXISTS "Post_status_idx" ON "Post"("status");
CREATE INDEX IF NOT EXISTS "Post_createdAt_idx" ON "Post"("createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Post_userId_fkey'
  ) THEN
    ALTER TABLE "Post"
      ADD CONSTRAINT "Post_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
