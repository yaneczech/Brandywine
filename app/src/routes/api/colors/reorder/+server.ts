import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colors } from '$db/schema';
import { eq } from 'drizzle-orm';

// Body: { ids: string[] } — ordered list of color IDs
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const { ids } = await request.json();
	if (!Array.isArray(ids)) error(400, 'ids must be an array');

	await db.transaction(async (tx) => {
		for (let i = 0; i < ids.length; i++) {
			await tx.update(colors).set({ order: i }).where(eq(colors.id, ids[i]));
		}
	});

	return json({ ok: true });
};
