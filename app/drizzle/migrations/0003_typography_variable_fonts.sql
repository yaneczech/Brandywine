-- Variable font support columns on typography_fonts
ALTER TABLE "typography_fonts" ADD COLUMN IF NOT EXISTS "is_variable" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "typography_fonts" ADD COLUMN IF NOT EXISTS "variable_axes" json DEFAULT '[]'::json;--> statement-breakpoint

-- Theme column on typography_styles (light/dark/universal)
ALTER TABLE "typography_styles" ADD COLUMN IF NOT EXISTS "theme" text NOT NULL DEFAULT 'universal';--> statement-breakpoint
ALTER TABLE "typography_styles" ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0;--> statement-breakpoint

-- Font files table for self-hosted font uploads
CREATE TABLE IF NOT EXISTS "typography_font_files" (
	"id" text PRIMARY KEY NOT NULL,
	"font_id" text NOT NULL,
	"original_name" text NOT NULL,
	"storage_path" text NOT NULL,
	"format" text NOT NULL,
	"file_size" integer NOT NULL,
	"is_variable" boolean DEFAULT false,
	"axes" json DEFAULT '[]'::json,
	"uploaded_at" text NOT NULL,
	CONSTRAINT "typography_font_files_font_id_typography_fonts_id_fk"
		FOREIGN KEY ("font_id") REFERENCES "public"."typography_fonts"("id") ON DELETE cascade ON UPDATE no action
);
