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
import { sendEmail, getAppUrl, actionEmail } from '$server/email';
import * as m from '$lib/paraglide/messages';

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
			subject: m.email_reset_subject(),
			...actionEmail({
				title: m.email_reset_title(), body: m.email_reset_body(), action: m.email_reset_action(),
				footer: m.email_reset_footer(), textIntro: m.email_reset_text_intro(), link,
			}),
		});
	}

	// Always return ok — don't reveal whether email exists
	return json({ ok: true });
};
