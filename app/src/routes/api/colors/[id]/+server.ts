import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { colors } from '$db/schema';
import { eq } from 'drizzle-orm';
import { hexToAllFormats } from '$lib/utils/colors';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();
	const updates: Partial<typeof colors.$inferInsert> = {};

	if (body.name !== undefined) updates.name = String(body.name).trim();
	if (body.hex !== undefined) {
		if (!/^#[0-9a-fA-F]{6}$/.test(body.hex)) error(400, 'Invalid hex color');
		const formats = hexToAllFormats(body.hex);
		updates.hex = body.hex.toLowerCase();
		updates.rgb = formats.rgb;
		updates.hsl = formats.hsl;
		updates.cmyk = formats.cmyk;
	}
	if (body.paletteId !== undefined) updates.paletteId = body.paletteId;
	if (body.pantoneRef !== undefined) updates.pantoneRef = body.pantoneRef;
	if (body.ralRef !== undefined) updates.ralRef = body.ralRef;
	if (body.order !== undefined) updates.order = Number(body.order);

	if (!Object.keys(updates).length) error(400, 'Nothing to update');

	const [updated] = await db
		.update(colors)
		.set(updates)
		.where(eq(colors.id, params.id))
		.returning();
	if (!updated) error(404, 'Color not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	await db.delete(colors).where(eq(colors.id, params.id));
	return json({ ok: true });
};
