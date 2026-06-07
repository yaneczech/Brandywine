-- Allow typography styles to declare approved text colors.
ALTER TABLE "typography_styles"
  ADD COLUMN IF NOT EXISTS "allowed_colors" json DEFAULT '[]'::json;
