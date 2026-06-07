import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { folders, assets } from '$db/schema';
import { eq, sql, count } from 'drizzle-orm';

// GET /api/folders — flat list with asset counts (client builds tree)
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const rows = await db
		.select({
			id:          folders.id,
			parentId:    folders.parentId,
			name:        folders.name,
			path:        folders.path,
			description: folders.description,
			color:       folders.color,
			icon:        folders.icon,
			createdAt:   folders.createdAt,
			assetCount:  count(assets.id),
		})
		.from(folders)
		.leftJoin(assets, eq(assets.folderId, folders.id))
		.groupBy(folders.id)
		.orderBy(folders.path);

	return json(rows);
};

// POST /api/folders — create folder
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const body = await request.json().catch(() => null) as Record<string, unknown> | null;
	if (!body?.name || typeof body.name !== 'string') error(400, 'name is required');

	const name = body.name.trim();
	if (!name) error(400, 'name cannot be empty');

	// Resolve parent path
	let parentPath = '';
	if (body.parentId) {
		const [parent] = await db.select({ path: folders.path })
			.from(folders).where(eq(folders.id, body.parentId as string)).limit(1);
		if (!parent) error(404, 'Parent folder not found');
		parentPath = parent.path;
	}

	const path = parentPath ? `${parentPath}/${name}` : name;

	const [inserted] = await db.insert(folders).values({
		name,
		path,
		parentId: (body.parentId as string | null) ?? null,
		description: (body.description as string | null) ?? null,
		color: (body.color as string | null) ?? null,
		icon: (body.icon as string | null) ?? null,
	}).returning();

	return json(inserted, { status: 201 });
};
