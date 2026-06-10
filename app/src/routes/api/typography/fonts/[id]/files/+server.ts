import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyFontFiles, assets } from '$db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';
import { saveFile } from '$lib/server/storage';
import { createHash } from 'crypto';

const ALLOWED_FORMATS = ['woff2', 'woff', 'ttf', 'otf', 'eot'] as const;
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

type FontFormat = typeof ALLOWED_FORMATS[number];

const MIME_MAP: Record<FontFormat, string> = {
	woff2: 'font/woff2',
	woff:  'font/woff',
	ttf:   'font/ttf',
	otf:   'font/otf',
	eot:   'application/vnd.ms-fontobject',
};

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
	if (!locals.user || !canEdit(locals.user.role)) error(403, 'Forbidden');

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	if (!file) error(400, 'No file provided');
	if (file.size > MAX_SIZE) error(400, 'File too large (max 50 MB)');

	const format = detectFormat(file.name);
	if (!format) error(400, `Unsupported format. Allowed: ${ALLOWED_FORMATS.join(', ')}`);

	const buffer      = Buffer.from(await file.arrayBuffer());
	const storagePath = (await saveFile(file.name, buffer, 'fonts')).replace(/\\/g, '/');
	const mime        = MIME_MAP[format];
	const hash        = createHash('sha256').update(buffer).digest('hex');

	// 1. Create shared Asset record so the file appears in Assets manager
	const [assetRecord] = await db.insert(assets).values({
		filename:    file.name,
		mime,
		size:        file.size,
		storagePath,
		hash,
		tags:        ['typography', 'font'],
		metadata:    { source: 'typography', fontId: params.id },
	}).returning();

	// 2. Create font file record linked to the asset
	const [record] = await db.insert(typographyFontFiles).values({
		id:          createId(),
		fontId:      params.id,
		originalName: file.name,
		storagePath,
		format,
		fileSize:    file.size,
		isVariable:  false,
		axes:        [],
		assetId:     assetRecord.id,
	}).returning();

	return json({ ...record, asset: assetRecord }, { status: 201 });
};
