import { db } from '$db';
import { teamMembers, teamPermissions } from '$db/schema';
import { eq, and, inArray, isNotNull } from 'drizzle-orm';

// Only the fields permission checks actually need — accepts both
// SessionUser (locals.user) and full DB rows
type User = { id: string; role: string };
export type Action = 'read' | 'download' | 'write' | 'upload' | 'share';
export type ResourceType = 'section' | 'folder' | 'collection';

// ── Global role helpers ───────────────────────────────────────────────────────
// Role hierarchy: admin (3) > editor (2) > member (1)
// admin  — full access incl. users & system settings
// editor — brand content (colors, typography, assets, manual); no user/settings mgmt
// member — read-only, asset downloads

const ROLE_LEVEL: Record<string, number> = { admin: 3, editor: 2, member: 1 };

/** User can edit brand content (editor or above). */
export function canEdit(role: string): boolean {
	return (ROLE_LEVEL[role] ?? 0) >= ROLE_LEVEL.editor;
}

/** User has full admin access. */
export function isAdmin(role: string): boolean {
	return role === 'admin';
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Admin má vždy přístup ke všemu.
 * Member musí mít explicitní oprávnění přes tým.
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

	// Najdi všechny týmy, ve kterých je user členem
	const memberships = await db
		.select({ teamId: teamMembers.teamId })
		.from(teamMembers)
		.where(and(eq(teamMembers.userId, user.id), isNotNull(teamMembers.acceptedAt)));

	if (memberships.length === 0) return false;

	const teamIds = memberships.map((m) => m.teamId);

	// Ověř, jestli má některý z týmů požadovanou akci na daný zdroj
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
 * Vrátí všechna resource_id daného typu, ke kterým má user přístup.
 * Užitečné pro filtrování listů (které složky vidím?).
 */
export async function accessibleResources(
	user: User,
	resourceType: ResourceType,
	action: Action = 'read'
): Promise<string[]> {
	if (canEdit(user.role)) return ['*']; // wildcard = vše

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
