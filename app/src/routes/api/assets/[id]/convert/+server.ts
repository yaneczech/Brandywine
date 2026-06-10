import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { eq } from 'drizzle-orm';
import { enqueueConvert } from '$lib/server/queue';

const ALLOWED_FORMATS = ['webp', 'avif'] as const;
type Format = (typeof ALLOWED_FORMATS)[number];

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const body = await request.json().catch(() => ({})) as { format?: string };
	const format = body.format as Format;
	if (!ALLOWED_FORMATS.includes(format)) {
		error(400, `format must be one of: ${ALLOWED_FORMATS.join(', ')}`);
	}

	const [asset] = await db.select().from(assets).where(eq(assets.id, params.id)).limit(1);
	if (!asset) error(404, 'Asset not found');

	// Only raster images can be converted
	const convertible = asset.mime.startsWith('image/') &&
		!['image/svg+xml'].includes(asset.mime);
	if (!convertible) error(422, 'Asset type cannot be converted to this format');

	// Check if already converted
	const existing = asset.convertedPaths ?? {};
	if (existing[format]) {
		return json({ status: 'exists', path: existing[format] });
	}

	await enqueueConvert(asset.id, asset.storagePath, format);
	return json({ status: 'queued', format }, { status: 202 });
};
