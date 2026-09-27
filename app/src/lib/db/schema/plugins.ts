import { pgTable, text, boolean, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import type { PluginManifest } from '$lib/plugins/runtime';

// ── Runtime plugins ────────────────────────────────────────────────────────────
// Installed from a zip in Admin → Plugins; files live in RUNTIME_PLUGINS_DIR/<id>/.
export const runtimePlugins = pgTable('runtime_plugins', {
	id:          text('id').primaryKey(),          // manifest id = folder name
	version:     text('version').notNull(),
	enabled:     boolean('enabled').notNull().default(false),
	manifest:    jsonb('manifest').$type<PluginManifest>().notNull(),
	installedAt: timestamp('installed_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Key-value storage plugins get through ctx.storage (compiled and runtime plugins alike)
export const pluginData = pgTable('plugin_data', {
	pluginId:  text('plugin_id').notNull(),
	key:       text('key').notNull(),
	value:     jsonb('value').$type<unknown>(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.pluginId, t.key] })]);
