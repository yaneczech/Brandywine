import { pgTable, text, real, integer } from 'drizzle-orm/pg-core';
// real is used for size/lineHeight/tracking float columns below
import { createId } from '../id';

export const typographyFonts = pgTable('typography_fonts', {
	id: text('id').primaryKey().$defaultFn(createId),
	name: text('name').notNull(),
	foundry: text('foundry'),
	license: text('license'),
	sourceUrl: text('source_url'),
	order: integer('order').notNull().default(0)
});

export const typographyStyles = pgTable('typography_styles', {
	id: text('id').primaryKey().$defaultFn(createId),
	fontId: text('font_id').references(() => typographyFonts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	size: real('size'),
	lineHeight: real('line_height'),
	tracking: real('tracking'),
	weight: integer('weight'),
	order: integer('order').notNull().default(0)
});
