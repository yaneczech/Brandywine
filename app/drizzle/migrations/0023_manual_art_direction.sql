ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "manual_typography_preset" text DEFAULT 'neutral' NOT NULL;
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "manual_landing_layout" text DEFAULT 'grid' NOT NULL;
