import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { colorGradients } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const rows = await db.select().from(colorGradients).orderBy(asc(colorGradients.order));
	return json(rows);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();

	if (!body.name?.trim()) error(400, { message: 'Name is required' });
	if (!Array.isArray(body.stops) || body.stops.length < 2) error(400, { message: 'At least 2 stops required' });

	const [row] = await db.insert(colorGradients).values({
		name: body.name.trim(),
		type: body.type ?? 'linear',
		angle: body.angle ?? 135,
		stops: body.stops,
		paletteId: body.paletteId || null,
		order: body.order ?? 0
	}).returning();

	return json(row, { status: 201 });
};
