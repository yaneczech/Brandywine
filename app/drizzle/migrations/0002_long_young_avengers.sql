ALTER TABLE "typography_fonts" ADD COLUMN "role" text DEFAULT 'body';--> statement-breakpoint
ALTER TABLE "typography_fonts" ADD COLUMN "weights" json DEFAULT '[400]'::json;--> statement-breakpoint
ALTER TABLE "typography_styles" ADD COLUMN "tag" text;