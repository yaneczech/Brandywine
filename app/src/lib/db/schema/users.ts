import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '../id';

// Globální role — admin má přístup ke všemu, member řídí týmy
export const globalRoleEnum = pgEnum('global_role', ['admin', 'member']);

export const users = pgTable('users', {
	id: text('id').primaryKey().$defaultFn(createId),
	email: text('email').notNull().unique(),
	name: text('name'),
	role: globalRoleEnum('role').notNull().default('member'),
	passwordHash: text('password_hash'),
	magicToken: text('magic_token'),
	magicTokenExpiresAt: timestamp('magic_token_expires_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
