ALTER TABLE "colors"
ADD COLUMN IF NOT EXISTS "production_refs" jsonb NOT NULL DEFAULT '[]'::jsonb;
