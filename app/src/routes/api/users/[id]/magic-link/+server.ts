import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createMagicToken } from '$server/auth';

export const POST: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

	const [user] = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(eq(users.id, params.id));
	if (!user) error(404, 'User not found');

	const { token, expiresAt } = createMagicToken();
	await db
		.update(users)
		.set({ magicToken: token, magicTokenExpiresAt: expiresAt })
		.where(eq(users.id, params.id));

	const link = `${url.origin}/api/auth/magic?token=${token}`;
	return json({ link, expiresAt, email: user.email });
};
