import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colors, colorPalettes } from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { hexToAllFormats } from '$lib/utils/colors';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const paletteId = url.searchParams.get('paletteId');

	const query = db
		.select({
			color: colors,
			palette: { id: colorPalettes.id, name: colorPalettes.name }
		})
		.from(colors)
		.leftJoin(colorPalettes, eq(colors.paletteId, colorPalettes.id))
		.orderBy(asc(colors.order));

	if (paletteId) query.where(eq(colors.paletteId, paletteId));

	return json(await query);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();

	if (!body.name?.trim()) error(400, 'Name is required');
	if (!/^#[0-9a-fA-F]{6}$/.test(body.hex ?? '')) error(400, 'Invalid hex color');

	const formats = hexToAllFormats(body.hex);
	const [{ maxOrder }] = await db
		.select({ maxOrder: db.$count(colors) })
		.from(colors);

	const [color] = await db
		.insert(colors)
		.values({
			id: createId(),
			name: body.name.trim(),
			hex: body.hex.toLowerCase(),
			rgb: formats.rgb,
			hsl: formats.hsl,
			cmyk: formats.cmyk,
			paletteId: body.paletteId ?? null,
			pantoneRef: body.pantoneRef ?? null,
			ralRef: body.ralRef ?? null,
			order: maxOrder
		})
		.returning();

	return json(color, { status: 201 });
};
