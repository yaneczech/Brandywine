import { pgTable, text, integer, bigint, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export const folders = pgTable('folders', {
	id: text('id').primaryKey().$defaultFn(createId),
	// Self-referential FK — callback form required by Drizzle to avoid circular init
	parentId: text('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	path: text('path').notNull()
});

export const assets = pgTable('assets', {
	id: text('id').primaryKey().$defaultFn(createId),
	filename: text('filename').notNull(),
	mime: text('mime').notNull(),
	// bigint — integer maxuje na ~2 GB, video soubory ho překročí
	size: bigint('size', { mode: 'number' }).notNull(),
	storagePath: text('storage_path').notNull(),
	thumbnailPath: text('thumbnail_path'),
	folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
	tags: jsonb('tags').$type<string[]>().default([]),
	metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
	hash: text('hash'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const assetVersions = pgTable('asset_versions', {
	id: text('id').primaryKey().$defaultFn(createId),
	assetId: text('asset_id')
		.notNull()
		.references(() => assets.id, { onDelete: 'cascade' }),
	version: integer('version').notNull(),
	storagePath: text('storage_path').notNull(),
	changelog: text('changelog'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
