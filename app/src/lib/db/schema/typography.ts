import { pgTable, text, real, integer, json, boolean } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export type FontRole = 'display' | 'body' | 'mono' | 'accent';
export type StyleTheme = 'universal' | 'light' | 'dark';
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontFormat = 'woff2' | 'woff' | 'ttf' | 'otf' | 'eot';

export interface VariableAxis {
	tag: string;       // e.g. "wght", "wdth", "ital", "slnt", "opsz"
	label: string;     // e.g. "Weight", "Width", "Italic"
	min: number;
	max: number;
	default: number;
}

export const typographyFonts = pgTable('typography_fonts', {
	id: text('id').primaryKey().$defaultFn(createId),
	name: text('name').notNull(),
	foundry: text('foundry'),
	license: text('license'),
	sourceUrl: text('source_url'),          // external CSS URL (Google Fonts, Adobe, etc.)
	role: text('role').$type<FontRole>().default('body'),
	weights: json('weights').$type<FontWeight[]>().default([400]),
	// Variable font support
	isVariable: boolean('is_variable').default(false),
	variableAxes: json('variable_axes').$type<VariableAxis[]>().default([]),
	order: integer('order').notNull().default(0)
});

export const typographyFontFiles = pgTable('typography_font_files', {
	id: text('id').primaryKey().$defaultFn(createId),
	fontId: text('font_id').notNull().references(() => typographyFonts.id, { onDelete: 'cascade' }),
	originalName: text('original_name').notNull(),
	storagePath: text('storage_path').notNull(),  // relative path under uploads/fonts/
	format: text('format').$type<FontFormat>().notNull(),
	fileSize: integer('file_size').notNull(),
	isVariable: boolean('is_variable').default(false),
	// For variable fonts — detected axes stored here too for quick access
	axes: json('axes').$type<VariableAxis[]>().default([]),
	uploadedAt: text('uploaded_at').notNull().$defaultFn(() => new Date().toISOString())
});

export const typographyStyles = pgTable('typography_styles', {
	id: text('id').primaryKey().$defaultFn(createId),
	fontId: text('font_id').references(() => typographyFonts.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	tag: text('tag'),                       // e.g. "h1", "p", "span"
	size: real('size'),                     // px
	lineHeight: real('line_height'),
	tracking: real('tracking'),             // em
	weight: integer('weight'),              // 400 or variable axis value
	order: integer('order').notNull().default(0),
	theme: text('theme').$type<StyleTheme>().notNull().default('universal')
});
