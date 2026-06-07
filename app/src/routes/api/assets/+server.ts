import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { inArray, isNull, or } from 'drizzle-orm';
import { accessibleResources } from '$server/permissions';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
	const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 50)));
	const offset = (page - 1) * limit;

	if (locals.user.role === 'admin') {
		const all = await db.select().from(assets).limit(limit).offset(offset);
		return json({ data: all, page, limit });
	}

	// Members see only assets in folders they have 'read' access to (+ root-level assets)
	const folderIds = await accessibleResources(locals.user, 'folder', 'read');
	if (folderIds.length === 0) return json({ data: [], page, limit });

	const filtered = await db
		.select()
		.from(assets)
		.where(or(isNull(assets.folderId), inArray(assets.folderId, folderIds)))
		.limit(limit)
		.offset(offset);

	return json({ data: filtered, page, limit });
};

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	// TODO: file upload — MIME detection, path guard, queue dispatch
	return json({ message: 'upload not yet implemented' }, { status: 501 });
};
