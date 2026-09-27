import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colors, colorPalettes } from '$db/schema';
import { asc, eq, isNull, max } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { hexToAllFormats } from '$lib/utils/colors';
import { normalizeProductionRefs } from '$lib/utils/productionRefs';

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
		.orderBy(asc(colors.order), asc(colors.name));

	if (paletteId) query.where(eq(colors.paletteId, paletteId));

	return json(await query);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const body = await request.json();

	if (!body.name?.trim()) error(400, 'Name is required');
	if (!/^#[0-9a-fA-F]{6}$/.test(body.hex ?? '')) error(400, 'Invalid hex color');

	const formats = hexToAllFormats(body.hex);
	const productionRefs = normalizeProductionRefs(body.productionRefs);
	const pantoneRef = productionRefs.find((ref) => ref.type === 'pantone')?.value ?? body.pantoneRef ?? null;
	const ralRef = productionRefs.find((ref) => ref.type === 'ral')?.value ?? body.ralRef ?? null;

	// Count only colors in the same palette (null paletteId = "unassigned" group)
	const paletteId: string | null = body.paletteId ?? null;
	const [orderRow] = await db
		.select({ maxOrder: max(colors.order) })
		.from(colors)
		.where(paletteId ? eq(colors.paletteId, paletteId) : isNull(colors.paletteId));
	const nextOrder = (orderRow?.maxOrder ?? -1) + 1;

	const [color] = await db
		.insert(colors)
		.values({
			id: createId(),
			name: body.name.trim(),
			hex: body.hex.toLowerCase(),
			rgb: formats.rgb,
			hsl: formats.hsl,
			cmyk: formats.cmyk,
			paletteId,
			pantoneRef,
			ralRef,
			productionRefs,
			order: nextOrder
		})
		.returning();

	return json(color, { status: 201 });
};
