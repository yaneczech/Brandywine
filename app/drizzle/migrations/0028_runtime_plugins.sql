CREATE TABLE IF NOT EXISTS "runtime_plugins" (
	"id" text PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"manifest" jsonb NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "plugin_data" (
	"plugin_id" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_data_plugin_id_key_pk" PRIMARY KEY("plugin_id","key")
);
