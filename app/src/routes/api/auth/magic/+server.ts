import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createMagicToken, createSession } from '$server/auth';
import { sendEmail, getAppUrl, actionEmail } from '$server/email';
import * as m from '$lib/paraglide/messages';
import { emit } from '$server/events';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Invalid JSON');
	const { email } = body as { email?: string };
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

	const appUrl = getAppUrl(request);
	const link = `${appUrl}/api/auth/magic?token=${token}`;

	await sendEmail({
		to: email,
		subject: m.email_magic_subject(),
		...actionEmail({
			title: m.email_magic_title(), body: m.email_magic_body(), action: m.email_magic_action(),
			footer: m.email_magic_footer(), textIntro: m.email_magic_text_intro(), link,
		}),
	});

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
	emit('user.signedIn', { user: { id: user.id, email: user.email, role: user.role }, method: 'magic-link' });
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});

	redirect(302, '/admin');
};
