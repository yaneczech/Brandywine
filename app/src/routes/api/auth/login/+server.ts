import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSession } from '$server/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Invalid JSON');
	const { email, password } = body as { email?: string; password?: string };
	if (!email || !password) error(400, 'Email and password required');

	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (!user?.passwordHash) error(401, 'Invalid credentials');

	const valid = await verifyPassword(password, user.passwordHash);
	if (!valid) error(401, 'Invalid credentials');

	const sessionId = await createSession(user.id);
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});

	return json({ ok: true, role: user.role });
};
