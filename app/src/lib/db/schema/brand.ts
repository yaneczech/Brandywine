import { pgTable, text, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const accessModeEnum = ['public', 'password', 'email_whitelist', 'token'] as const;
export type AccessMode = (typeof accessModeEnum)[number];

export const brandSettings = pgTable('brand_settings', {
	id: integer('id').primaryKey().default(1),
	// Identity
	systemName: text('system_name').notNull().default('Brandywine'),
	logoPath: text('logo_path'),
	faviconPath: text('favicon_path'),
	// Brand colors
	primaryColor: text('primary_color').default('#4A1204'),
	// Brand manual settings
	name: text('name').notNull().default('My Brand'),
	// Access control
	accessMode: text('access_mode').$type<AccessMode>().notNull().default('public'),
	accessPassword: text('access_password'),
	emailWhitelist: jsonb('email_whitelist').$type<string[]>().default([]),
	activeLanguages: jsonb('active_languages').$type<string[]>().default(['en', 'cs']),
	defaultLanguage: text('default_language').notNull().default('en'),
	// Attribution
	showAttribution: boolean('show_attribution').notNull().default(true),
	customFooterText: text('custom_footer_text')
});
