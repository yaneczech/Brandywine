ALTER TABLE "brand_settings"
  ADD COLUMN IF NOT EXISTS "manual_background_color_dark" text,
  ADD COLUMN IF NOT EXISTS "manual_surface_color_dark" text,
  ADD COLUMN IF NOT EXISTS "manual_text_color_dark" text,
  ADD COLUMN IF NOT EXISTS "manual_muted_color_dark" text;
