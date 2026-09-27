import { pgTable, text, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '../id';

// ── Webhooks ───────────────────────────────────────────────────────────────────
// Outgoing HTTP notifications of Brandywine events (see $lib/events).
export const webhooks = pgTable('webhooks', {
	id:              text('id').primaryKey().$defaultFn(createId),
	url:             text('url').notNull(),
	// HMAC-SHA256 key for the X-Brandywine-Signature header
	secret:          text('secret').notNull(),
	// Event names to send; empty = every event
	events:          jsonb('events').$type<string[]>().notNull().default([]),
	enabled:         boolean('enabled').notNull().default(true),
	lastStatus:      integer('last_status'),          // HTTP status of the last delivery, 0 = network error
	lastError:       text('last_error'),
	lastDeliveredAt: timestamp('last_delivered_at', { withTimezone: true }),
	createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
