import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from '$db';
import { sessions, users } from '$db/schema';
import { eq } from 'drizzle-orm';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 min

// Fields exposed via locals.user — never include passwordHash / magicToken
const SESSION_USER_FIELDS = {
	id:        users.id,
	email:     users.email,
	name:      users.name,
	role:      users.role,
	createdAt: users.createdAt,
	updatedAt: users.updatedAt,
} as const;

export type SessionUser = {
	id: string;
	email: string;
	name: string | null;
	role: 'admin' | 'editor' | 'member';
	createdAt: Date;
	updatedAt: Date;
};

export async function createSession(userId: string): Promise<string> {
	const id = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return id;
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
	// Single JOIN — no N+1
	const [row] = await db
		.select({ ...SESSION_USER_FIELDS, expiresAt: sessions.expiresAt })
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (!row || row.expiresAt < new Date()) return null;

	const { expiresAt: _, ...user } = row;
	return user as SessionUser;
}

export async function deleteSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function hashPassword(plain: string): Promise<string> {
	return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plain, hash);
}

export function createMagicToken() {
	return {
		token: randomBytes(32).toString('hex'),
		expiresAt: new Date(Date.now() + MAGIC_LINK_DURATION_MS)
	};
}
