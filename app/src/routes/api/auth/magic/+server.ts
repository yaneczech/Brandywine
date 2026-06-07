import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createMagicToken, createSession } from '$server/auth';

export const POST: RequestHandler = async ({ request }) => {
	const { email } = await request.json();
	if (!email) error(400, 'Email required');

	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
	if (!user) {
		// Don't reveal if email exists
		return json({ ok: true });
	}

	const { token, expiresAt } = createMagicToken();
	await db
		.update(users)
		.set({ magicToken: token, magicTokenExpiresAt: expiresAt })
		.where(eq(users.id, user.id));

	// TODO: send email with magic link
	console.log(`Magic link token for ${email}: ${token}`);

	return json({ ok: true });
};

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');
	if (!token) error(400, 'Token required');

	const [user] = await db.select().from(users).where(eq(users.magicToken, token)).limit(1);
	if (!user?.magicTokenExpiresAt || user.magicTokenExpiresAt < new Date()) {
		error(401, 'Invalid or expired token');
	}

	await db
		.update(users)
		.set({ magicToken: null, magicTokenExpiresAt: null })
		.where(eq(users.id, user.id));

	const sessionId = await createSession(user.id);
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});

	return new Response(null, { status: 302, headers: { Location: '/admin' } });
};
