import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';

// Minimal schema for write-back operations — mirrors app schema
export const assets = pgTable('assets', {
	id:             text('id').primaryKey(),
	thumbnailPath:  text('thumbnail_path'),
	convertedPaths: jsonb('converted_paths').$type<{ webp?: string; avif?: string }>(),
	metadata:       jsonb('metadata').$type<Record<string, unknown>>(),
	updatedAt:      timestamp('updated_at').notNull().defaultNow(),
});

const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://brandywine:brandywine@db:5432/brandywine');
export const db = drizzle(sql, { schema: { assets } });
