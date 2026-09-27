import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { verifyPassword } from '$server/auth';

export const MANUAL_ACCESS_COOKIE = 'manual_access';

function safeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}

export function manualAccessGrant(passwordHash: string, secret = env.SESSION_SECRET): string {
	if (!secret || secret.length < 32) {
		throw new Error('SESSION_SECRET must contain at least 32 characters');
	}
	return createHmac('sha256', secret)
		.update(`brandywine:manual-access:${passwordHash}`)
		.digest('base64url');
}

export function hasManualAccessGrant(cookieValue: string | undefined, passwordHash: string | null, secret = env.SESSION_SECRET): boolean {
	if (!cookieValue || !passwordHash) return false;
	return safeEqual(cookieValue, manualAccessGrant(passwordHash, secret));
}

export async function verifyManualPassword(input: string, stored: string | null): Promise<boolean> {
	if (!stored) return false;
	if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
		return verifyPassword(input, stored);
	}
	// Compatibility for instances that saved a password before hashing was added.
	return safeEqual(input, stored);
}

export function isEmailAllowed(email: string, whitelist: string[] | null | undefined): boolean {
	const candidate = email.trim().toLowerCase();
	if (!candidate) return false;

	return (whitelist ?? []).some((rawEntry) => {
		const entry = rawEntry.trim().toLowerCase();
		if (!entry) return false;
		if (entry.startsWith('*@')) return candidate.endsWith(entry.slice(1));
		return candidate === entry;
	});
}

type AccessSettings = {
	accessMode?: string | null;
	accessPassword?: string | null;
	emailWhitelist?: string[] | null;
} | null | undefined;

type AccessUser = { role: string; email: string } | null | undefined;

/**
 * Whether the current request may read manual content outside the page
 * layout (uploaded files, generated downloads). Mirrors the manual layout guard;
 * maintainers always pass.
 */
export function hasManualViewAccess(settings: AccessSettings, user: AccessUser, accessCookie: string | undefined): boolean {
	if (user && (user.role === 'admin' || user.role === 'editor')) return true;
	const mode = settings?.accessMode ?? 'public';
	if (mode === 'password') return hasManualAccessGrant(accessCookie, settings?.accessPassword ?? null);
	if (mode === 'email_whitelist') return Boolean(user && isEmailAllowed(user.email, settings?.emailWhitelist));
	if (mode === 'token') return Boolean(user);
	return true;
}

export function safeReturnPath(value: string | null | undefined, fallback = '/'): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
	if (value === '/access' || value.startsWith('/access?')) return fallback;
	return value;
}
