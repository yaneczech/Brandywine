-- Link typography font files to assets table
ALTER TABLE "typography_font_files"
  ADD COLUMN IF NOT EXISTS "asset_id" text
  REFERENCES "assets"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "typography_font_files_asset_id_idx"
  ON "typography_font_files"("asset_id");
