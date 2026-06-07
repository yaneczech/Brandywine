CREATE TABLE "color_gradients" (
	"id" text PRIMARY KEY NOT NULL,
	"palette_id" text,
	"name" text NOT NULL,
	"type" text DEFAULT 'linear' NOT NULL,
	"angle" integer DEFAULT 135 NOT NULL,
	"stops" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brand_settings" ALTER COLUMN "primary_color" SET DEFAULT '#4A1204';--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "system_name" text DEFAULT 'Brandywine' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "favicon_path" text;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "show_attribution" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_settings" ADD COLUMN "custom_footer_text" text;--> statement-breakpoint
ALTER TABLE "color_gradients" ADD CONSTRAINT "color_gradients_palette_id_color_palettes_id_fk" FOREIGN KEY ("palette_id") REFERENCES "public"."color_palettes"("id") ON DELETE set null ON UPDATE no action;