import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { folders, assets } from '$db/schema';
import { eq, like, and, ne } from 'drizzle-orm';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Collect all descendant folder IDs (breadth-first, flat list). */
async function descendantIds(folderId: string): Promise<string[]> {
	const ids: string[] = [];
	const queue = [folderId];
	while (queue.length) {
		const parentId = queue.shift()!;
		const children = await db
			.select({ id: folders.id })
			.from(folders)
			.where(eq(folders.parentId, parentId));
		for (const c of children) {
			ids.push(c.id);
			queue.push(c.id);
		}
	}
	return ids;
}

/** Recalculate path for a folder given its parent's path and its own name. */
function buildPath(parentPath: string | null, name: string) {
	return parentPath ? `${parentPath}/${name}` : name;
}

// ── PATCH ──────────────────────────────────────────────────────────────────

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const body = await request.json().catch(() => null) as Record<string, unknown> | null;
	if (!body) error(400, 'Invalid JSON');

	const allowed = ['name', 'parentId', 'description', 'color', 'icon'] as const;
	const patch: Record<string, unknown> = {};
	for (const k of allowed) {
		if (k in body) patch[k] = body[k];
	}
	if (!Object.keys(patch).length) error(400, 'Nothing to update');

	// Load current folder
	const [current] = await db.select().from(folders).where(eq(folders.id, params.id)).limit(1);
	if (!current) error(404, 'Folder not found');

	// Validate + recalculate path when name or parentId changes
	if ('name' in patch || 'parentId' in patch) {
		const newName     = ((patch.name as string | undefined) ?? current.name).trim();
		if (!newName) error(400, 'name cannot be empty');
		patch.name = newName;

		const newParentId = ('parentId' in patch ? patch.parentId : current.parentId) as string | null;

		// ── Cycle prevention ────────────────────────────────────────────────
		if (newParentId) {
			if (newParentId === params.id) error(400, 'A folder cannot be its own parent');
			const descendants = await descendantIds(params.id);
			if (descendants.includes(newParentId)) {
				error(400, 'Moving a folder into one of its own descendants would create a cycle');
			}
		}

		// ── Resolve parent path ─────────────────────────────────────────────
		let parentPath: string | null = null;
		if (newParentId) {
			const [parent] = await db.select({ path: folders.path })
				.from(folders).where(eq(folders.id, newParentId)).limit(1);
			if (!parent) error(404, 'Parent folder not found');
			parentPath = parent.path;
		}

		// ── Unique sibling name check ────────────────────────────────────────
		const siblingPath = buildPath(parentPath, newName);
		const [conflict] = await db.select({ id: folders.id }).from(folders)
			.where(and(eq(folders.path, siblingPath), ne(folders.id, params.id)))
			.limit(1);
		if (conflict) error(409, `A folder named "${newName}" already exists at this level`);

		const newPath = siblingPath;
		const oldPath = current.path;

		// ── Recursive path update for all descendants ────────────────────────
		if (oldPath !== newPath) {
			const allDescendants = await db.select({ id: folders.id, path: folders.path })
				.from(folders).where(like(folders.path, `${oldPath}/%`));
			for (const d of allDescendants) {
				const updatedPath = newPath + d.path.slice(oldPath.length);
				await db.update(folders).set({ path: updatedPath }).where(eq(folders.id, d.id));
			}
		}

		patch.path     = newPath;
		patch.parentId = newParentId;
	}

	const [updated] = await db.update(folders).set(patch).where(eq(folders.id, params.id)).returning();
	if (!updated) error(404, 'Folder not found');
	return json(updated);
};

// ── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const [current] = await db.select({ parentId: folders.parentId })
		.from(folders).where(eq(folders.id, params.id)).limit(1);
	if (!current) error(404, 'Folder not found');

	const body = await request.json().catch(() => ({})) as { moveAssetsTo?: string | null };

	// Validate moveAssetsTo target if provided
	if (body.moveAssetsTo) {
		const [target] = await db.select({ id: folders.id })
			.from(folders).where(eq(folders.id, body.moveAssetsTo)).limit(1);
		if (!target) error(400, 'Target folder not found');

		// Prevent moving into a descendant of the folder being deleted
		const descendants = await descendantIds(params.id);
		if (descendants.includes(body.moveAssetsTo)) {
			error(400, 'Cannot move assets into a folder that is being deleted');
		}
	}

	const targetId = body.moveAssetsTo ?? null;

	// Re-parent direct assets
	await db.update(assets)
		.set({ folderId: targetId })
		.where(eq(assets.folderId, params.id));

	// Re-parent immediate child folders to parent of deleted folder (preserve hierarchy)
	// Unless a specific target is given, use the folder's own parent
	const reparentTo = targetId ?? current.parentId ?? null;
	const immediateChildren = await db.select({ id: folders.id, path: folders.path, name: folders.name })
		.from(folders).where(eq(folders.parentId, params.id));

	for (const child of immediateChildren) {
		let newParentPath: string | null = null;
		if (reparentTo) {
			const [tp] = await db.select({ path: folders.path })
				.from(folders).where(eq(folders.id, reparentTo)).limit(1);
			newParentPath = tp?.path ?? null;
		}
		const newChildPath = buildPath(newParentPath, child.name);
		const oldChildPath = child.path;

		// Update child and all its descendants
		await db.update(folders).set({ parentId: reparentTo, path: newChildPath })
			.where(eq(folders.id, child.id));

		if (oldChildPath !== newChildPath) {
			const grandchildren = await db.select({ id: folders.id, path: folders.path })
				.from(folders).where(like(folders.path, `${oldChildPath}/%`));
			for (const gc of grandchildren) {
				await db.update(folders)
					.set({ path: newChildPath + gc.path.slice(oldChildPath.length) })
					.where(eq(folders.id, gc.id));
			}
		}
	}

	const [deleted] = await db.delete(folders).where(eq(folders.id, params.id)).returning({ id: folders.id });
	if (!deleted) error(404, 'Folder not found');
	return json({ ok: true });
};
