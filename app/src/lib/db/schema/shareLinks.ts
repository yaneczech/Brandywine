import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '../id';
import { assets } from './assets';

export const shareLinks = pgTable('share_links', {
	id: text('id').primaryKey().$defaultFn(createId),
	token: text('token').notNull().unique(),
	assetId: text('asset_id').references(() => assets.id, { onDelete: 'cascade' }),
	passwordHash: text('password_hash'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
