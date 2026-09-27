import { db } from '$db';
import { teamMembers, teamPermissions } from '$db/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { hasRole } from '$lib/auth/roles';

// Only the fields permission checks actually need — accepts both
// SessionUser (locals.user) and full DB rows
type User = { id: string; role: string };
export type Action = 'read' | 'download' | 'write' | 'upload' | 'share';
export type ResourceType = 'section' | 'folder' | 'collection';

// ── Global role helpers ───────────────────────────────────────────────────────
// Roles and their order live in $lib/auth/roles (client-safe).

/** User can edit brand content (editor or above). */
export function canEdit(role: string): boolean {
	return hasRole(role, 'editor');
}

/** User has full admin access. */
export function isAdmin(role: string): boolean {
	return hasRole(role, 'admin');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whether the user may perform an action on a resource. Editors and admins
 * may do everything; members need an explicit permission through a team.
 */
export async function can(
	user: User,
	action: Action,
	resourceType: ResourceType,
	resourceId: string
): Promise<boolean> {
	// Global editors manage all brand content. Team permissions only narrow
	// read-only members; applying them to editors made uploaded assets disappear
	// from the editor and prevented their download.
	if (canEdit(user.role)) return true;

	// Teams the user has joined
	const memberships = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(and(eq(teamMembers.userId, user.id), isNotNull(teamMembers.acceptedAt)));

	if (memberships.length === 0) return false;

	const teamIds = memberships.map((m) => m.teamId);

	// Does any of those teams grant the action on this resource?
	const perms = await db
		.select({ actions: teamPermissions.actions })
		.from(teamPermissions)
		.where(
			and(
				inArray(teamPermissions.teamId, teamIds),
				eq(teamPermissions.resourceType, resourceType),
				eq(teamPermissions.resourceId, resourceId)
			)
		);

	return perms.some((p) => p.actions.includes(action));
}

/**
 * All resource ids of a type the user may access — for filtering lists
 * ("which folders can I see?"). `['*']` means everything.
 */
export async function accessibleResources(
	user: User,
	resourceType: ResourceType,
	action: Action = 'read'
): Promise<string[]> {
	if (canEdit(user.role)) return ['*'];

	const memberships = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(and(eq(teamMembers.userId, user.id), isNotNull(teamMembers.acceptedAt)));

	if (memberships.length === 0) return [];

	const teamIds = memberships.map((m) => m.teamId);

	const perms = await db
		.select({ resourceId: teamPermissions.resourceId, actions: teamPermissions.actions })
		.from(teamPermissions)
		.where(
			and(
				inArray(teamPermissions.teamId, teamIds),
				eq(teamPermissions.resourceType, resourceType)
			)
		);

	return perms.filter((p) => p.actions.includes(action)).map((p) => p.resourceId);
}
