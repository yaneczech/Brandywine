import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyFonts, typographyStyles, typographyFontFiles } from '$db/schema';
import { eq, asc } from 'drizzle-orm';
import { deleteFile } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const [font] = await db.select().from(typographyFonts).where(eq(typographyFonts.id, params.id));
	if (!font) error(404, 'Font not found');
	const styles = await db.select().from(typographyStyles)
		.where(eq(typographyStyles.fontId, params.id))
		.orderBy(asc(typographyStyles.order));
	return json({ ...font, styles });
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');
	const body = await request.json();
	const updates: Record<string, unknown> = {};
	if (body.name !== undefined) updates.name = String(body.name).trim();
	if (body.foundry !== undefined) updates.foundry = body.foundry || null;
	if (body.license !== undefined) updates.license = body.license || null;
	if (body.sourceUrl !== undefined) updates.sourceUrl = body.sourceUrl || null;
	if (body.role !== undefined) updates.role = body.role;
	if (body.weights !== undefined) updates.weights = body.weights;
	if (body.isVariable !== undefined) updates.isVariable = Boolean(body.isVariable);
	if (body.variableAxes !== undefined) updates.variableAxes = body.variableAxes;
	if (body.order !== undefined) updates.order = Number(body.order);
	if (!Object.keys(updates).length) error(400, 'Nothing to update');

	const [updated] = await db.update(typographyFonts).set(updates).where(eq(typographyFonts.id, params.id)).returning();
	if (!updated) error(404, 'Font not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');

	// Load all font files before cascading delete so we can clean up disk
	const files = await db.select({ storagePath: typographyFontFiles.storagePath })
		.from(typographyFontFiles)
		.where(eq(typographyFontFiles.fontId, params.id));

	// DB delete — cascades to typography_styles and typography_font_files
	const [deleted] = await db.delete(typographyFonts)
		.where(eq(typographyFonts.id, params.id))
		.returning({ id: typographyFonts.id });
	if (!deleted) error(404, 'Font not found');

	// Clean up physical files after successful DB delete (best-effort)
	await Promise.allSettled(files.map(f => deleteFile(f.storagePath)));

	return json({ ok: true });
};
