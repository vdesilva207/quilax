-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "difficulty" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "isOver18" BOOLEAN DEFAULT false,
ADD COLUMN     "quizRejectedAt" TIMESTAMP(3),
ADD COLUMN     "quizSubmittedAt" TIMESTAMP(3);
