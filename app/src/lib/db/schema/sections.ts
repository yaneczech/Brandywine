import { pgTable, text, boolean, integer, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createId } from '../id';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

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
	cardImage:    text('card_image'),      // cover on page cards; falls back to featureImage, then an auto preview
	heroBgSize:   text('hero_bg_size'),    // 'cover' | 'contain' | 'tile' — default cover when null
	bgColor:      text('bg_color'),        // hex — full card + hero background
	textColor:    text('text_color'),      // hex — text on bgColor (WCAG-checked)
	subpagesPosition: text('subpages_position').$type<'start' | 'end'>().notNull().default('end'), // child-page cards before or after blocks
	createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	index('idx_manual_pages_slug').on(t.slug),
	index('idx_manual_pages_parent').on(t.parentId),
	index('idx_manual_pages_landing').on(t.isLanding).where(sql`${t.isLanding} = true`),
	index('manual_pages_parent_order').on(t.parentId, t.sortOrder),
	// Slugs are unique among siblings; top-level pages share the '' parent
	uniqueIndex('manual_pages_parent_slug').on(sql`COALESCE(${t.parentId}, '')`, t.slug),
]);

// ── Blocks ─────────────────────────────────────────────────────────────────────
export const manualBlocks = pgTable('manual_blocks', {
	id:        text('id').primaryKey().$defaultFn(createId),
	pageId:    text('page_id').notNull().references(() => manualPages.id, { onDelete: 'cascade' }),
	type:      text('type').notNull(),   // a registered block type, see src/lib/blocks
	config:    jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
	sortOrder: integer('sort_order').notNull().default(0),
	enabled:   boolean('enabled').notNull().default(true),
	anchor:    text('anchor'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	index('idx_manual_blocks_page_sort').on(t.pageId, t.sortOrder),
]);
