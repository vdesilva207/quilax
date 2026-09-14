-- Persist admin prize distribution config (Reparto Quiz / season jackpot)
ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "prizeConfig" JSONB;
