import type { PageServerLoad, Actions } from './$types';
import { redirect, fail, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { count } from 'drizzle-orm';
import { hashPassword, createSession } from '$server/auth';
import { createId } from '$lib/db/id';

export const load: PageServerLoad = async () => {
	// Setup only available when no users exist
	const [{ value }] = await db.select({ value: count() }).from(users);
	if (value > 0) error(403, 'Setup already completed');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		// Double-check: still no users (race condition guard)
		const [{ value }] = await db.select({ value: count() }).from(users);
		if (value > 0) return fail(403, { error: 'Setup already completed' });

		const form = await request.formData();
		const email = form.get('email')?.toString().trim();
		const password = form.get('password')?.toString();
		const name = form.get('name')?.toString().trim();

		if (!email || !password) return fail(400, { error: 'Email and password are required' });
		if (password.length < 12) return fail(400, { error: 'Password must be at least 12 characters' });

		const passwordHash = await hashPassword(password);
		const [admin] = await db
			.insert(users)
			.values({ id: createId(), email, name, role: 'admin', passwordHash })
			.returning();

		const sessionId = await createSession(admin.id);
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
