/**
 * POST /api/auth/reset-password
 * Body: { email: string }
 * Generates a password-reset token (stored in magicToken / magicTokenExpiresAt),
 * sends an email with a link to /admin/reset-password?token=…
 * Always returns { ok: true } to avoid leaking whether an email exists.
 */

import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createMagicToken } from '$server/auth';
import { sendEmail, getAppUrl } from '$server/email';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (!email) error(400, 'Email required');

	const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

	if (user) {
		const { token, expiresAt } = createMagicToken();
		await db
			.update(users)
			.set({ magicToken: token, magicTokenExpiresAt: expiresAt })
			.where(eq(users.id, user.id));

		const appUrl = getAppUrl(request);
		const link = `${appUrl}/admin/reset-password?token=${token}`;

		await sendEmail({
			to: email,
			subject: 'Obnovení hesla — Brandywine',
			text: `Požádali jste o obnovení hesla. Klikněte na odkaz níže (platí 15 minut):\n\n${link}\n\nPokud jste o obnovení hesla nepožádali, ignorujte tento email.`,
			html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#171717">
  <p style="font-size:1.125rem;font-weight:600;margin:0 0 8px">Obnovení hesla</p>
  <p style="color:#737373;margin:0 0 24px">Požádali jste o obnovení hesla v Brandywine. Kliknutím na tlačítko nastavíte nové heslo. Odkaz je platný 15 minut.</p>
  <a href="${link}" style="display:inline-block;padding:12px 24px;background:#4A1204;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Nastavit nové heslo</a>
  <p style="font-size:.8125rem;color:#a3a3a3;margin:24px 0 0">Pokud jste o obnovení hesla nepožádali, ignorujte tento email. Vaše heslo zůstane nezměněno.</p>
</div>`
		});
	}

	// Always return ok — don't reveal whether email exists
	return json({ ok: true });
};
