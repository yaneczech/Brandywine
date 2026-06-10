/**
 * Shared safe user field selection — excludes sensitive columns
 * (passwordHash, magicToken, magicTokenExpiresAt).
 * Import this in any route that reads or returns user records.
 */
import { users } from '$lib/db/schema';

export const SAFE_USER_FIELDS = {
	id: users.id,
	email: users.email,
	name: users.name,
	role: users.role,
	createdAt: users.createdAt,
	updatedAt: users.updatedAt,
} as const;
