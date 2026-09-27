ALTER TABLE "manual_pages" ADD COLUMN IF NOT EXISTS "subpages_position" text DEFAULT 'end' NOT NULL;
