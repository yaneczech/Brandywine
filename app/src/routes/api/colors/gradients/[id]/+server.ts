import { canEdit } from '$server/permissions';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { colorGradients } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const body = await request.json();
	const [row] = await db.update(colorGradients).set({
		...(body.name !== undefined && { name: body.name }),
		...(body.type !== undefined && { type: body.type }),
		...(body.angle !== undefined && { angle: body.angle }),
		...(body.stops !== undefined && { stops: body.stops }),
		...(body.paletteId !== undefined && { paletteId: body.paletteId || null }),
	}).where(eq(colorGradients.id, params.id)).returning();
	if (!row) error(404, 'Not found');
	return json(row);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	await db.delete(colorGradients).where(eq(colorGradients.id, params.id));
	return new Response(null, { status: 204 });
};
