import { pgTable, text, integer, bigint, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export const folders = pgTable('folders', {
	id: text('id').primaryKey().$defaultFn(createId),
	// Self-referential FK — callback form required by Drizzle to avoid circular init
	parentId: text('parent_id').references((): AnyPgColumn => folders.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	path: text('path').notNull(),
	description: text('description'),
	color: text('color'),   // hex colour that tells folders apart
	icon: text('icon'),     // emoji or icon name
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_folders_parent_id').on(t.parentId),
]);

export const assets = pgTable('assets', {
	id: text('id').primaryKey().$defaultFn(createId),
	filename: text('filename').notNull(),
	mime: text('mime').notNull(),
	// bigint — integer tops out at ~2 GB, video files exceed it
	size: bigint('size', { mode: 'number' }).notNull(),
	storagePath: text('storage_path').notNull(),
	thumbnailPath: text('thumbnail_path'),
	convertedPaths: jsonb('converted_paths').$type<{ webp?: string; avif?: string }>().default({}),
	folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
	tags: jsonb('tags').$type<string[]>().default([]),
	metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
	hash: text('hash'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_assets_created_at').on(t.createdAt),
	index('idx_assets_mime').on(t.mime),
	index('idx_assets_folder_id').on(t.folderId),
	index('idx_assets_hash').on(t.hash),
]);

export const assetVersions = pgTable('asset_versions', {
	id: text('id').primaryKey().$defaultFn(createId),
	assetId: text('asset_id')
		.notNull()
		.references(() => assets.id, { onDelete: 'cascade' }),
	version: integer('version').notNull(),
	storagePath: text('storage_path').notNull(),
	changelog: text('changelog'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_asset_versions_asset_id').on(t.assetId),
]);
