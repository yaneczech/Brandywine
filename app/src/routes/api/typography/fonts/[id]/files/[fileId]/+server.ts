import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyFontFiles } from '$db/schema';
import { eq, and } from 'drizzle-orm';
import { deleteFile } from '$lib/server/storage';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { UPLOAD_DIR } from '$env/static/private';

const MIME: Record<string, string> = {
	woff2: 'font/woff2',
	woff:  'font/woff',
	ttf:   'font/ttf',
	otf:   'font/otf',
	eot:   'application/vnd.ms-fontobject'
};

/** Sanitize a filename for use in Content-Disposition header */
function safeFilename(name: string): string {
	return name.replace(/[^\w.\-]/g, '_').replace(/^\.+/, '_');
}

export const GET: RequestHandler = async ({ params, locals, url }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const [file] = await db.select().from(typographyFontFiles)
		.where(and(
			eq(typographyFontFiles.id, params.fileId),
			eq(typographyFontFiles.fontId, params.id)
		));
	if (!file) error(404, 'File not found');

	// Guard against path traversal: resolved path must stay within UPLOAD_DIR
	const uploadRoot = resolve(UPLOAD_DIR);
	const fullPath = resolve(join(UPLOAD_DIR, file.storagePath));
	if (!fullPath.startsWith(uploadRoot + '/') && fullPath !== uploadRoot) {
		error(400, 'Invalid file path');
	}

	const buffer = await readFile(fullPath);
	const mime = MIME[file.format] ?? 'application/octet-stream';
	const isDownload = url.searchParams.get('dl') === '1';
	const safeName = safeFilename(file.originalName);

	return new Response(buffer, {
		headers: {
			'Content-Type': mime,
			'Content-Length': String(buffer.length),
			'Content-Disposition': isDownload
				? `attachment; filename="${safeName}"`
				: `inline; filename="${safeName}"`,
			'Cache-Control': 'private, max-age=86400'
		}
	});
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();
	const updates: Record<string, unknown> = {};
	if (body.isVariable !== undefined) updates.isVariable = Boolean(body.isVariable);
	if (body.axes !== undefined) updates.axes = body.axes;
	if (!Object.keys(updates).length) error(400, 'Nothing to update');

	const [updated] = await db.update(typographyFontFiles).set(updates)
		.where(and(
			eq(typographyFontFiles.id, params.fileId),
			eq(typographyFontFiles.fontId, params.id)
		)).returning();
	if (!updated) error(404, 'File not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

	const [file] = await db.select().from(typographyFontFiles)
		.where(and(
			eq(typographyFontFiles.id, params.fileId),
			eq(typographyFontFiles.fontId, params.id)
		));
	if (!file) error(404, 'File not found');

	await deleteFile(file.storagePath).catch(() => {/* ignore if already gone */});
	await db.delete(typographyFontFiles).where(eq(typographyFontFiles.id, params.fileId));
	return json({ ok: true });
};
