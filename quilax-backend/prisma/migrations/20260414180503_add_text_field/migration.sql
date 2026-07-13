/*
  Warnings:

  - You are about to drop the column `answer` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `answeredAt` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `quizRunId` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `responseTimeMs` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `QuizAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `QuizAnswer` table. All the data in the column will be lost.
  - Added the required column `text` to the `QuizAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_quizRunId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizEnrollment" DROP CONSTRAINT "QuizEnrollment_quizId_fkey";

-- DropForeignKey
ALTER TABLE "QuizQuestion" DROP CONSTRAINT "QuizQuestion_quizId_fkey";

-- DropForeignKey
ALTER TABLE "QuizRun" DROP CONSTRAINT "QuizRun_quizId_fkey";

-- DropForeignKey
ALTER TABLE "QuizSchedule" DROP CONSTRAINT "QuizSchedule_quizId_fkey";

-- DropForeignKey
ALTER TABLE "QuizWinner" DROP CONSTRAINT "QuizWinner_quizId_fkey";

-- DropForeignKey
ALTER TABLE "RewardRule" DROP CONSTRAINT "RewardRule_quizId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_quizId_fkey";

-- DropIndex
DROP INDEX "QuizAnswer_quizRunId_questionId_idx";

-- DropIndex
DROP INDEX "QuizAnswer_quizRunId_questionId_userId_key";

-- DropIndex
DROP INDEX "QuizAnswer_quizRunId_userId_idx";

-- AlterTable
ALTER TABLE "Quiz" ALTER COLUMN "requestedDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuizAnswer" DROP COLUMN "answer",
DROP COLUMN "answeredAt",
DROP COLUMN "ipAddress",
DROP COLUMN "quizRunId",
DROP COLUMN "responseTimeMs",
DROP COLUMN "score",
DROP COLUMN "userAgent",
ADD COLUMN     "text" TEXT NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "QuizQuestion" ALTER COLUMN "maxPoints" SET DEFAULT 1000;

-- CreateTable
CREATE TABLE "QuizRunAnswer" (
    "id" SERIAL NOT NULL,
    "quizRunId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "text" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizRunAnswer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizEnrollment" ADD CONSTRAINT "QuizEnrollment_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSchedule" ADD CONSTRAINT "QuizSchedule_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizWinner" ADD CONSTRAINT "QuizWinner_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizRun" ADD CONSTRAINT "QuizRun_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRule" ADD CONSTRAINT "RewardRule_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizRunAnswer" ADD CONSTRAINT "QuizRunAnswer_quizRunId_fkey" FOREIGN KEY ("quizRunId") REFERENCES "QuizRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
