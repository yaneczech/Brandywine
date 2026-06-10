import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { users } from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { hashPassword } from '$server/auth';

const SAFE_FIELDS = {
	id: users.id,
	email: users.email,
	name: users.name,
	role: users.role,
	createdAt: users.createdAt,
	updatedAt: users.updatedAt,
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const all = await db.select(SAFE_FIELDS).from(users).orderBy(asc(users.createdAt));
	return json(all);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

	const body = await request.json();
	const email = String(body.email ?? '').trim().toLowerCase();
	const name  = body.name ? String(body.name).trim() || null : null;
	const role  = (['admin', 'editor', 'member'] as const).includes(body.role) ? body.role : 'member';
	const password = body.password ? String(body.password) : null;

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error(400, 'Invalid email');

	const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
	if (existing) error(409, 'Email already in use');

	const passwordHash = password ? await hashPassword(password) : null;

	const [created] = await db
		.insert(users)
		.values({ id: createId(), email, name, role, passwordHash })
		.returning(SAFE_FIELDS);

	return json(created, { status: 201 });
};
