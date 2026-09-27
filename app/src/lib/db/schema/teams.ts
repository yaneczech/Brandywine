import { pgTable, text, timestamp, pgEnum, unique, index } from 'drizzle-orm/pg-core';
import { createId } from '../id';
import { users } from './users';

// A user's role within a team
export const teamRoleEnum = pgEnum('team_role', ['owner', 'member']);

// Actions a permission can grant on a resource
export const permissionActionEnum = pgEnum('permission_action', [
	'read',      // view
	'download',  // download assets
	'write',     // editace obsahu / metadat
	'upload',    // upload files
	'share'      // create share links
]);

// Kind of resource a permission applies to
export const resourceTypeEnum = pgEnum('resource_type', [
	'section',    // brand manual section (colors, logos, typography…)
	'folder',     // asset folder
	'collection'  // curated collection
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

// One permission = team + resource type + resource_id + allowed actions
// actions is a PostgreSQL enum[], so the database enforces valid values
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

// Invitations for people without an account, sent by email
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
