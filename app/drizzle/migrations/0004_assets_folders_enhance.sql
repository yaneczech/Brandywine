-- Enhance folders: description, color, icon, createdAt
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "color" text;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "icon" text;
ALTER TABLE "folders" ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now();

-- Enhance assets: convertedPaths
ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "converted_paths" jsonb DEFAULT '{}'::jsonb;
