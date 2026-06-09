-- Text color for manual pages (paired with bg_color, WCAG contrast-checked in admin)
ALTER TABLE manual_pages
  ADD COLUMN IF NOT EXISTS text_color TEXT;         -- hex, e.g. '#ffffff'
