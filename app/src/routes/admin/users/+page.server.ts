import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/admin');
	const all = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			role: users.role,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
		})
		.from(users)
		.orderBy(asc(users.createdAt));

	return { users: all, currentUserId: locals.user?.id ?? null };
};
