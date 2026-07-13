-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN_WORKER';

-- AlterTable
ALTER TABLE "AdminAccess" ADD COLUMN     "changeScheduledAt" TIMESTAMP(3),
ADD COLUMN     "pendingPassword" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountBic" TEXT,
ADD COLUMN     "bankAccountIban" TEXT,
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "guardianPhotoUrl" TEXT,
ADD COLUMN     "idDocumentType" TEXT,
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "idVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "idVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isBankVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'es',
ADD COLUMN     "profilePublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showPrizes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showQuizHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "verificationVideoUrl" TEXT;
