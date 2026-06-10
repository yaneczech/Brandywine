import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyFonts } from '$db/schema';
import { asc, sql } from 'drizzle-orm';
import { createId } from '$lib/db/id';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const fonts = await db.select().from(typographyFonts).orderBy(asc(typographyFonts.order));
	return json(fonts);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const body = await request.json();
	if (!body.name?.trim()) error(400, 'Name required');

	const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(typographyFonts);

	const [font] = await db.insert(typographyFonts).values({
		id: createId(),
		name: body.name.trim(),
		foundry: body.foundry ?? null,
		license: body.license ?? null,
		sourceUrl: body.sourceUrl ?? null,
		role: body.role ?? 'body',
		weights: body.weights ?? [400],
		isVariable: body.isVariable ?? false,
		variableAxes: body.variableAxes ?? [],
		order: count
	}).returning();

	return json(font, { status: 201 });
};
