import * as m from '$lib/paraglide/messages';
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, createSession } from '$server/auth';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (locals.user) redirect(302, '/admin');

	const token = url.searchParams.get('token') ?? '';
	if (!token) redirect(302, '/admin/login');

	// Check token validity
	const [user] = await db.select().from(users).where(eq(users.magicToken, token)).limit(1);
	if (!user?.magicTokenExpiresAt || user.magicTokenExpiresAt < new Date()) {
		return { valid: false, token };
	}

	return { valid: true, token, email: user.email };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const token    = form.get('token')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';
		const confirm  = form.get('confirm')?.toString() ?? '';

		if (!token) return fail(400, { error: m.auth_err_missing_token() });
		if (password.length < 8) return fail(400, { error: m.auth_err_password_short(), token });
		if (password !== confirm) return fail(400, { error: m.auth_err_password_mismatch(), token });

		const [user] = await db.select().from(users).where(eq(users.magicToken, token)).limit(1);
		if (!user?.magicTokenExpiresAt || user.magicTokenExpiresAt < new Date()) {
			return fail(400, { error: m.auth_err_link_expired(), token });
		}

		const passwordHash = await hashPassword(password);
		await db
			.update(users)
			.set({ passwordHash, magicToken: null, magicTokenExpiresAt: null })
			.where(eq(users.id, user.id));

		// Log the user in immediately
		const sessionId = await createSession(user.id);
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30
		});

		redirect(302, '/admin');
	}
};
