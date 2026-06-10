import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$server/auth';
import { SAFE_USER_FIELDS } from '$lib/server/userFields';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

	const body = await request.json();
	const updates: Partial<typeof users.$inferInsert> = {};

	if (body.name !== undefined) updates.name = body.name ? String(body.name).trim() || null : null;
	if (body.email !== undefined) {
		const email = String(body.email).trim().toLowerCase();
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error(400, 'Invalid email');
		updates.email = email;
	}
	if (body.role !== undefined) {
		if (!['admin', 'editor', 'member'].includes(body.role)) error(400, 'Invalid role');
		if (params.id === locals.user.id && body.role !== 'admin') {
			error(400, 'Cannot remove your own admin role');
		}
		updates.role = body.role;
	}
	if (body.password) {
		if (String(body.password).length < 8) error(400, 'Password must be at least 8 characters');
		updates.passwordHash = await hashPassword(String(body.password));
	}
	updates.updatedAt = new Date();

	const [updated] = await db
		.update(users)
		.set(updates)
		.where(eq(users.id, params.id))
		.returning(SAFE_USER_FIELDS);

	if (!updated) error(404, 'User not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	if (params.id === locals.user.id) error(400, 'Cannot delete yourself');

	const [deleted] = await db.delete(users).where(eq(users.id, params.id)).returning({ id: users.id });
	if (!deleted) error(404, 'User not found');

	return json({ ok: true });
};
