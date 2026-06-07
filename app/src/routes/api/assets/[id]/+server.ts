import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const [asset] = await db.select().from(assets).where(eq(assets.id, params.id)).limit(1);
	if (!asset) error(404, 'Asset not found');
	return json(asset);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');
	await db.delete(assets).where(eq(assets.id, params.id));
	return json({ ok: true });
};
