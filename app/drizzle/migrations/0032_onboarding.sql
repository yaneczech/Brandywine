ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "onboarded_at" timestamp with time zone;
-- Installations that already have users skip the welcome wizard
UPDATE "brand_settings" SET "onboarded_at" = now() WHERE "onboarded_at" IS NULL AND EXISTS (SELECT 1 FROM "users");
