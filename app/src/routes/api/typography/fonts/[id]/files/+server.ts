import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyFontFiles } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { saveFile, deleteFile } from '$lib/server/storage';

const ALLOWED_FORMATS = ['woff2', 'woff', 'ttf', 'otf', 'eot'] as const;
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

type FontFormat = typeof ALLOWED_FORMATS[number];

function detectFormat(filename: string): FontFormat | null {
	const ext = filename.split('.').pop()?.toLowerCase();
	return ALLOWED_FORMATS.includes(ext as FontFormat) ? ext as FontFormat : null;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const files = await db.select().from(typographyFontFiles)
		.where(eq(typographyFontFiles.fontId, params.id));
	return json(files);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	if (!file) error(400, 'No file provided');
	if (file.size > MAX_SIZE) error(400, 'File too large (max 50 MB)');

	const format = detectFormat(file.name);
	if (!format) error(400, `Unsupported format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);

	const buffer = Buffer.from(await file.arrayBuffer());

	const storagePath = (await saveFile(file.name, buffer, 'fonts')).replace(/\\/g, '/');

	const [record] = await db.insert(typographyFontFiles).values({
		id: createId(),
		fontId: params.id,
		originalName: file.name,
		storagePath,
		format,
		fileSize: file.size,
		isVariable: false,
		axes: []
	}).returning();

	return json(record, { status: 201 });
};
