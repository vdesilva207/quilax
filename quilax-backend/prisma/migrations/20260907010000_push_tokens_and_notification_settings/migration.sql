-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PushToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PushToken_userId_fkey'
  ) THEN
    ALTER TABLE "PushToken"
      ADD CONSTRAINT "PushToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
