import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createId } from '../id';

export const analyticsEvents = pgTable('analytics_events', {
	id: text('id').primaryKey().$defaultFn(createId),
	eventType: text('event_type').notNull(),
	assetId: text('asset_id'),  // intentionally no FK — analytics survive asset deletion
	section: text('section'),
	ipHash: text('ip_hash'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_analytics_created_at').on(t.createdAt.desc().nullsFirst()),
	index('idx_analytics_asset_id').on(t.assetId).where(sql`${t.assetId} IS NOT NULL`),
	index('idx_analytics_event_type').on(t.eventType),
]);
