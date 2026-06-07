-- Feature image + background color for manual pages
ALTER TABLE manual_pages
  ADD COLUMN IF NOT EXISTS feature_image TEXT,      -- path or URL
  ADD COLUMN IF NOT EXISTS bg_color      TEXT;      -- hex from brand palette, e.g. '#1a1a2e'
