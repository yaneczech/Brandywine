import { pgTable, text, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export const sectionTypeEnum = pgEnum('section_type', [
	'logos',
	'colors',
	'typography',
	'icons',
	'imagery',
	'illustrations',
	'templates',
	'strategy',
	'custom'
]);

export const manualSections = pgTable('manual_sections', {
	id: text('id').primaryKey().$defaultFn(createId),
	type: sectionTypeEnum('type').notNull(),
	enabled: boolean('enabled').notNull().default(true),
	order: integer('order').notNull().default(0),
	i18nContent: jsonb('i18n_content')
		.$type<Record<string, { title: string; description?: string }>>()
		.default({})
});
