import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colors, colorPalettes } from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { hexToAllFormats } from '$lib/utils/colors';

type ProductionRef = {
	type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other';
	label: string;
	value: string;
};

function normalizeProductionRefs(value: unknown): ProductionRef[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => {
			const record = item as Record<string, unknown>;
			const rawType = String(record.type ?? 'other');
			const type: ProductionRef['type'] =
				rawType === 'pantone' || rawType === 'ral' || rawType === 'ncs' || rawType === 'foil'
					? rawType
					: 'other';
			const label = String(record.label ?? '').trim();
			const refValue = String(record.value ?? '').trim();
			return {
				type,
				label: label || defaultProductionLabel(type),
				value: refValue
			};
		})
		.filter((item) => item.value);
}

function defaultProductionLabel(type: ProductionRef['type']) {
	if (type === 'pantone') return 'Pantone';
	if (type === 'ral') return 'RAL';
	if (type === 'ncs') return 'NCS';
	if (type === 'foil') return 'Signmaking fólie';
	return 'Reference';
}

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
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const body = await request.json();

	if (!body.name?.trim()) error(400, 'Name is required');
	if (!/^#[0-9a-fA-F]{6}$/.test(body.hex ?? '')) error(400, 'Invalid hex color');

	const formats = hexToAllFormats(body.hex);
	const productionRefs = normalizeProductionRefs(body.productionRefs);
	const pantoneRef = productionRefs.find((ref) => ref.type === 'pantone')?.value ?? body.pantoneRef ?? null;
	const ralRef = productionRefs.find((ref) => ref.type === 'ral')?.value ?? body.ralRef ?? null;
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
			pantoneRef,
			ralRef,
			productionRefs,
			order: maxOrder
		})
		.returning();

	return json(color, { status: 201 });
};
