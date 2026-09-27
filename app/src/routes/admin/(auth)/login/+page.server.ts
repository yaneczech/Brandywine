import * as m from '$lib/paraglide/messages';
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq, count } from 'drizzle-orm';
import { verifyPassword, createSession } from '$server/auth';
import { safeReturnPath } from '$server/manual-access';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(302, '/admin');

	// Fresh install — no users yet → redirect to setup
	const [{ value }] = await db.select({ value: count() }).from(users);
	if (value === 0) redirect(302, '/admin/setup');

	return { redirectTo: safeReturnPath(url.searchParams.get('redirect'), '/admin') };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim();
		const password = form.get('password')?.toString();

		if (!email || !password) return fail(400, { error: m.auth_email_password_required() });

		const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
			return fail(401, { error: m.auth_invalid_credentials() });
		}

		const sessionId = await createSession(user.id);
		cookies.set('session', sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 30
		});

		const redirectTo = safeReturnPath(form.get('redirectTo')?.toString(), '/admin');
		redirect(302, redirectTo);
	}
};
