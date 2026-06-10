import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets } from '$db/schema';
import { eq } from 'drizzle-orm';
import { deleteFile } from '$lib/server/storage';
import { can } from '$server/permissions';

async function loadAndAuthorise(
	assetId: string,
	user: App.Locals['user'],
	action: 'read' | 'download' = 'read'
) {
	if (!user) error(401, 'Unauthorized');
	const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
	if (!asset) error(404, 'Asset not found');

	// Admins always pass
	if (user.role !== 'admin') {
		const allowed = await can(user, action, 'folder', asset.folderId ?? '__root__');
		if (!allowed) error(403, 'Forbidden');
	}
	return asset;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const asset = await loadAndAuthorise(params.id, locals.user, 'read');
	return json(asset);
};

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Invalid JSON');

	const allowed = ['filename', 'folderId', 'tags', 'metadata'] as const;
	const patch: Record<string, unknown> = {};
	for (const key of allowed) {
		if (key in body) patch[key] = (body as Record<string, unknown>)[key];
	}

	if (Object.keys(patch).length === 0) error(400, 'Nothing to update');

	const [updated] = await db
		.update(assets)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(assets.id, params.id))
		.returning();

	if (!updated) error(404, 'Asset not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const [deleted] = await db
		.delete(assets)
		.where(eq(assets.id, params.id))
		.returning({ storagePath: assets.storagePath });

	if (!deleted) error(404, 'Asset not found');
	await deleteFile(deleted.storagePath).catch(() => {});
	return json({ ok: true });
};
