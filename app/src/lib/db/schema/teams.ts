import { pgTable, text, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { createId } from '../id';
import { users } from './users';

// Role uživatele uvnitř týmu
export const teamRoleEnum = pgEnum('team_role', ['owner', 'member']);

// Akce, které lze na zdroj přiřadit
export const permissionActionEnum = pgEnum('permission_action', [
	'read',      // prohlížení
	'download',  // stažení assetů
	'write',     // editace obsahu / metadat
	'upload',    // nahrávání souborů
	'share'      // tvorba sdílených odkazů
]);

// Typ zdroje, ke kterému se váže oprávnění
export const resourceTypeEnum = pgEnum('resource_type', [
	'section',    // sekce brand manuálu (colors, logos, typography…)
	'folder',     // složka v asset manageru
	'collection'  // kurátorská kolekce
]);

export const teams = pgTable('teams', {
	id: text('id').primaryKey().$defaultFn(createId),
	name: text('name').notNull(),
	description: text('description'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const teamMembers = pgTable(
	'team_members',
	{
		id: text('id').primaryKey().$defaultFn(createId),
		teamId: text('team_id')
			.notNull()
			.references(() => teams.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: teamRoleEnum('role').notNull().default('member'),
		invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
		acceptedAt: timestamp('accepted_at', { withTimezone: true })
	},
	(t) => [
		unique().on(t.teamId, t.userId),
		index('idx_team_members_user_id').on(t.userId),
	]
);

// Jedno oprávnění = tým + typ zdroje + konkrétní resource_id + seznam akcí
// actions je PostgreSQL enum[] — DB vynucuje povolené hodnoty
export const teamPermissions = pgTable(
	'team_permissions',
	{
		id: text('id').primaryKey().$defaultFn(createId),
		teamId: text('team_id')
			.notNull()
			.references(() => teams.id, { onDelete: 'cascade' }),
		resourceType: resourceTypeEnum('resource_type').notNull(),
		resourceId: text('resource_id').notNull(),
		actions: permissionActionEnum('actions').array().notNull().default(['read'])
	},
	(t) => [
		unique().on(t.teamId, t.resourceType, t.resourceId),
		index('idx_team_perms_resource').on(t.resourceType, t.resourceId),
	]
);

// Pozvánky pro uživatele bez účtu — přijdou přes email
export const teamInvitations = pgTable('team_invitations', {
	id: text('id').primaryKey().$defaultFn(createId),
	teamId: text('team_id')
		.notNull()
		.references(() => teams.id, { onDelete: 'cascade' }),
	email: text('email').notNull(),
	role: teamRoleEnum('role').notNull().default('member'),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
