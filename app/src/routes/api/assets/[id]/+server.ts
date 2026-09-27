import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { assets, folders } from '$db/schema';
import { eq } from 'drizzle-orm';
import { deleteFiles } from '$lib/server/storage';
import { can } from '$server/permissions';

async function loadAndAuthorise(
	assetId: string,
	user: App.Locals['user'],
	action: 'read' | 'download' = 'read'
) {
	if (!user) error(401, 'Unauthorized');
	const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
	if (!asset) error(404, 'Asset not found');

	// Global editors manage all brand content; members use folder grants.
	if (!canEdit(user.role)) {
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

	const input = body as Record<string, unknown>;
	const patch: Record<string, unknown> = {};

	if ('filename' in input) {
		if (typeof input.filename !== 'string') error(422, 'Filename must be a string');
		const filename = input.filename.trim();
		const hasControlCharacter = [...filename].some((character) => character.charCodeAt(0) < 32);
		if (!filename || filename.length > 255 || /[\\/]/.test(filename) || hasControlCharacter) {
			error(422, 'Filename is invalid');
		}
		patch.filename = filename;
	}

	if ('folderId' in input) {
		if (input.folderId !== null && typeof input.folderId !== 'string') {
			error(422, 'Folder must be an ID or null');
		}
		if (typeof input.folderId === 'string') {
			const [folder] = await db.select({ id: folders.id }).from(folders).where(eq(folders.id, input.folderId)).limit(1);
			if (!folder) error(422, 'Folder does not exist');
		}
		patch.folderId = input.folderId;
	}

	if ('tags' in input) {
		if (!Array.isArray(input.tags) || input.tags.some((tag) => typeof tag !== 'string')) {
			error(422, 'Tags must be an array of strings');
		}
		const tags = [...new Set((input.tags as string[]).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
		if (tags.length > 50 || tags.some((tag) => tag.length > 64)) error(422, 'Too many or too long tags');
		patch.tags = tags;
	}

	if ('metadata' in input) {
		if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) {
			error(422, 'Metadata must be an object');
		}
		if (JSON.stringify(input.metadata).length > 65_536) error(422, 'Metadata is too large');
		patch.metadata = input.metadata;
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
		.returning({
			storagePath: assets.storagePath,
			thumbnailPath: assets.thumbnailPath,
			convertedPaths: assets.convertedPaths,
			metadata: assets.metadata
		});

	if (!deleted) error(404, 'Asset not found');
	const pageThumbs = Array.isArray(deleted.metadata?.pageThumbs)
		? deleted.metadata.pageThumbs.filter((path): path is string => typeof path === 'string')
		: [];
	await deleteFiles([
		deleted.storagePath,
		deleted.thumbnailPath,
		...Object.values(deleted.convertedPaths ?? {}),
		...pageThumbs
	]);
	return json({ ok: true });
};
