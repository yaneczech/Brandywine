ALTER TABLE "typography_fonts" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'body';--> statement-breakpoint
ALTER TABLE "typography_fonts" ADD COLUMN IF NOT EXISTS "weights" json DEFAULT '[400]'::json;--> statement-breakpoint
ALTER TABLE "typography_styles" ADD COLUMN IF NOT EXISTS "tag" text;
