import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { db } from '$db';
import { sessions, users } from '$db/schema';
import { eq } from 'drizzle-orm';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_DURATION_MS = 15 * 60 * 1000; // 15 min

export async function createSession(userId: string): Promise<string> {
	const id = randomBytes(32).toString('hex');
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return id;
}

export async function getSession(sessionId: string) {
	const [session] = await db
		.select()
		.from(sessions)
		.where(eq(sessions.id, sessionId))
		.limit(1);
	if (!session || session.expiresAt < new Date()) return null;
	const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
	return user ?? null;
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
