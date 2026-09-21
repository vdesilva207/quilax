-- Quiz metadata for create flow + question images (were in schema without migration)
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "language" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "tips" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
