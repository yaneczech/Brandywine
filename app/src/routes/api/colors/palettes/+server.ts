import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colorPalettes } from '$db/schema';
import { asc } from 'drizzle-orm';
import { createId } from '$lib/db/id';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const palettes = await db.select().from(colorPalettes).orderBy(asc(colorPalettes.order));
	return json(palettes);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const { name } = await request.json();
	if (!name?.trim()) error(400, 'Name is required');

	const [{ maxOrder }] = await db
		.select({ maxOrder: db.$count(colorPalettes) })
		.from(colorPalettes);

	const [palette] = await db
		.insert(colorPalettes)
		.values({ id: createId(), name: name.trim(), order: maxOrder })
		.returning();

	return json(palette, { status: 201 });
};
