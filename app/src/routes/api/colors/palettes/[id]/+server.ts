import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colorPalettes, colors } from '$db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();
	const updates: Partial<typeof colorPalettes.$inferInsert> = {};
	if (body.name !== undefined) updates.name = String(body.name).trim();
	if (body.order !== undefined) updates.order = Number(body.order);
	if (!Object.keys(updates).length) error(400, 'Nothing to update');

	const [updated] = await db
		.update(colorPalettes)
		.set(updates)
		.where(eq(colorPalettes.id, params.id))
		.returning();
	if (!updated) error(404, 'Palette not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	// Unlink colors from palette before deleting
	await db.update(colors).set({ paletteId: null }).where(eq(colors.paletteId, params.id));
	await db.delete(colorPalettes).where(eq(colorPalettes.id, params.id));
	return json({ ok: true });
};
