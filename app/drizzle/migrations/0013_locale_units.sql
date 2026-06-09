ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "unit_digital" text NOT NULL DEFAULT 'px';
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "unit_print"   text NOT NULL DEFAULT 'mm';
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "unit_type"    text NOT NULL DEFAULT 'px';
ALTER TABLE "brand_settings" ADD COLUMN IF NOT EXISTS "locale_rules" jsonb NOT NULL DEFAULT '{}';
