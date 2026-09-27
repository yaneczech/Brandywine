import { pgTable, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { createId } from '../id';

// Global roles — admin > editor > member (see $lib/auth/roles)
// admin  — full access, including users and system settings
// editor — brand content (colours, typography, assets, manual), no users/settings
// member — read and download only
export const globalRoleEnum = pgEnum('global_role', ['admin', 'editor', 'member']);

export const users = pgTable('users', {
	id: text('id').primaryKey().$defaultFn(createId),
	email: text('email').notNull().unique(),
	name: text('name'),
	role: globalRoleEnum('role').notNull().default('member'),
	passwordHash: text('password_hash'),
	magicToken: text('magic_token'),
	magicTokenExpiresAt: timestamp('magic_token_expires_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (t) => [
	index('idx_sessions_user_id').on(t.userId),
	index('idx_sessions_expires_at').on(t.expiresAt),
]);
