import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export const analyticsEvents = pgTable('analytics_events', {
	id: text('id').primaryKey().$defaultFn(createId),
	eventType: text('event_type').notNull(),
	assetId: text('asset_id'),
	section: text('section'),
	ipHash: text('ip_hash'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
