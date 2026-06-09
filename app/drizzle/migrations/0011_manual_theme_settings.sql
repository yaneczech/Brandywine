ALTER TABLE brand_settings
	ADD COLUMN IF NOT EXISTS manual_theme_mode text NOT NULL DEFAULT 'light',
	ADD COLUMN IF NOT EXISTS manual_background_color text DEFAULT '#FBFAF8',
	ADD COLUMN IF NOT EXISTS manual_surface_color text DEFAULT '#FFFFFF',
	ADD COLUMN IF NOT EXISTS manual_text_color text DEFAULT '#171717',
	ADD COLUMN IF NOT EXISTS manual_muted_color text DEFAULT '#737373',
	ADD COLUMN IF NOT EXISTS manual_accent_color text;
