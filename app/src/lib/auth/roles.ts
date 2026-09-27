/**
 * Global roles, lowest to highest. Client-safe: no database access.
 *   member — read-only manual access and asset downloads
 *   editor — brand content (colours, typography, assets, manual)
 *   admin  — everything, including users and system settings
 */
export const ROLES = ['member', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Whether `role` is at least `required` (unknown roles have no rights). */
export function hasRole(role: string | null | undefined, required: Role): boolean {
	const level = ROLES.indexOf(role as Role);
	return level >= 0 && level >= ROLES.indexOf(required);
}
