import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createId } from '../id';
import { assets } from './assets';

export const shareLinks = pgTable('share_links', {
	id: text('id').primaryKey().$defaultFn(createId),
	token: text('token').notNull().unique(),
	assetId: text('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
	passwordHash: text('password_hash'),
	expiresAt: timestamp('expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_share_links_expires_at').on(t.expiresAt).where(sql`${t.expiresAt} IS NOT NULL`),
]);
