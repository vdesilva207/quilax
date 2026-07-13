/*
  Warnings:

  - Added the required column `quizRunId` to the `QuizWinner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuizWinner" ADD COLUMN     "quizRunId" INTEGER NOT NULL;
