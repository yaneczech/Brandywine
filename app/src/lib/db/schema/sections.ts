import { pgTable, text, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '../id';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// Re-export from the client-safe module so server code can import from here too.
export { BLOCK_TYPES, type BlockType } from '$lib/manual/blockTypes';
import type { BlockType } from '$lib/manual/blockTypes';

// ── Pages ──────────────────────────────────────────────────────────────────────
export const manualPages = pgTable('manual_pages', {
	id:          text('id').primaryKey().$defaultFn(createId),
	parentId:    text('parent_id').references((): AnyPgColumn => manualPages.id, { onDelete: 'set null' }),
	title:       text('title').notNull(),
	slug:        text('slug').notNull(),
	description: text('description'),
	sortOrder:    integer('sort_order').notNull().default(0),
	enabled:      boolean('enabled').notNull().default(true),
	isLanding:    boolean('is_landing').notNull().default(false),
	featureImage: text('feature_image'),   // asset path or URL
	bgColor:      text('bg_color'),        // hex — full card + hero background
	textColor:    text('text_color'),      // hex — text on bgColor (WCAG-checked)
	createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Blocks ─────────────────────────────────────────────────────────────────────
export const manualBlocks = pgTable('manual_blocks', {
	id:        text('id').primaryKey().$defaultFn(createId),
	pageId:    text('page_id').notNull().references(() => manualPages.id, { onDelete: 'cascade' }),
	type:      text('type').$type<BlockType>().notNull(),
	config:    jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	sortOrder: integer('sort_order').notNull().default(0),
	enabled:   boolean('enabled').notNull().default(true),
	anchor:    text('anchor'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
