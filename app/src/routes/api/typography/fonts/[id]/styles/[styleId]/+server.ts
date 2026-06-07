import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyStyles } from '$db/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();
	const updates: Record<string, unknown> = {};
	if (body.name !== undefined) updates.name = String(body.name).trim();
	if (body.tag !== undefined) updates.tag = body.tag || null;
	if (body.size !== undefined) updates.size = body.size === '' ? null : Number(body.size);
	if (body.lineHeight !== undefined) updates.lineHeight = body.lineHeight === '' ? null : Number(body.lineHeight);
	if (body.tracking !== undefined) updates.tracking = body.tracking === '' ? null : Number(body.tracking);
	if (body.weight !== undefined) updates.weight = body.weight === '' ? null : Number(body.weight);
	if (body.order !== undefined) updates.order = Number(body.order);
	if (body.theme !== undefined) updates.theme = ['universal', 'light', 'dark'].includes(body.theme) ? body.theme : 'universal';
	if (!Object.keys(updates).length) error(400, 'Nothing to update');

	const [updated] = await db
		.update(typographyStyles)
		.set(updates)
		.where(and(eq(typographyStyles.id, params.styleId), eq(typographyStyles.fontId, params.id)))
		.returning();
	if (!updated) error(404, 'Style not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const [deleted] = await db
		.delete(typographyStyles)
		.where(and(eq(typographyStyles.id, params.styleId), eq(typographyStyles.fontId, params.id)))
		.returning({ id: typographyStyles.id });
	if (!deleted) error(404, 'Style not found');
	return json({ ok: true });
};
