ALTER TABLE brand_settings
	ADD COLUMN IF NOT EXISTS manual_border_radius integer NOT NULL DEFAULT 8;
