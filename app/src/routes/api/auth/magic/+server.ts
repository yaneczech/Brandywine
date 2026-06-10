import type { RequestHandler } from './$types';
import { json, error, redirect } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createMagicToken, createSession } from '$server/auth';
import { sendEmail, getAppUrl } from '$server/email';

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
		subject: 'Přihlašovací odkaz — Brandywine',
		text: `Přihlaste se kliknutím na tento odkaz (platí 15 minut):\n\n${link}\n\nPokud jste o odkaz nepožádali, ignorujte tento email.`,
		html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#171717">
  <p style="font-size:1.125rem;font-weight:600;margin:0 0 8px">Přihlašovací odkaz</p>
  <p style="color:#737373;margin:0 0 24px">Kliknutím na tlačítko se přihlásíte do Brandywine. Odkaz je platný 15 minut.</p>
  <a href="${link}" style="display:inline-block;padding:12px 24px;background:#4A1204;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Přihlásit se</a>
  <p style="font-size:.8125rem;color:#a3a3a3;margin:24px 0 0">Pokud jste o odkaz nepožádali, ignorujte tento email. Odkaz nevyužijte — nic se nestane.</p>
</div>`
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
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});

	redirect(302, '/admin');
};
