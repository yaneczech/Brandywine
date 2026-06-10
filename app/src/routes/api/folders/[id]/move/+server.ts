import { canEdit } from '$server/permissions';
/**
 * PATCH /api/folders/[id]/move
 *
 * Moves a folder to a new parent and/or re-positions it among siblings.
 *
 * Body: { parentId: string | null; beforeId?: string; afterId?: string }
 *
 * - parentId  — target parent (null = root). Unchanged if not provided.
 * - beforeId  — place the folder immediately BEFORE this sibling.
 * - afterId   — place the folder immediately AFTER this sibling.
 * - If neither beforeId nor afterId is given the folder is appended last.
 *
 * Only one of beforeId / afterId should be supplied; beforeId wins if both are present.
 *
 * Guarantees:
 *   • Cycle prevention (cannot move into self or descendant)
 *   • Sibling name uniqueness after move
 *   • Recursive path recalculation for entire subtree
 *   • sort_order is re-gapped after every move (values 10, 20, 30 … so future inserts
 *     don't immediately require a full renumber)
 */
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { folders } from '$db/schema';
import { eq, like, and, ne, isNull, asc } from 'drizzle-orm';

// ── helpers (duplicated from [id]/+server.ts — extract to $lib/server/folders if it grows) ──

async function descendantIds(folderId: string): Promise<string[]> {
	const ids: string[] = [];
	const queue = [folderId];
	while (queue.length) {
		const parentId = queue.shift()!;
		const children = await db.select({ id: folders.id }).from(folders)
			.where(eq(folders.parentId, parentId));
		for (const c of children) { ids.push(c.id); queue.push(c.id); }
	}
	return ids;
}

function buildPath(parentPath: string | null, name: string) {
	return parentPath ? `${parentPath}/${name}` : name;
}

async function recalcSubtree(folderId: string, newPath: string, oldPath: string) {
	if (oldPath === newPath) return;
	const descendants = await db.select({ id: folders.id, path: folders.path })
		.from(folders).where(like(folders.path, `${oldPath}/%`));
	for (const d of descendants) {
		await db.update(folders)
			.set({ path: newPath + d.path.slice(oldPath.length) })
			.where(eq(folders.id, d.id));
	}
}

/** Re-number siblings 10, 20, 30 … after a move to keep gaps. */
async function renumberSiblings(parentId: string | null) {
	const siblings = await db.select({ id: folders.id })
		.from(folders)
		.where(parentId ? eq(folders.parentId, parentId) : isNull(folders.parentId))
		.orderBy(asc(folders.sortOrder), asc(folders.path));

	for (let i = 0; i < siblings.length; i++) {
		await db.update(folders)
			.set({ sortOrder: (i + 1) * 10 })
			.where(eq(folders.id, siblings[i].id));
	}
}

// ── handler ────────────────────────────────────────────────────────────────────

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const body = await request.json().catch(() => null) as {
		parentId?: string | null;
		beforeId?: string;
		afterId?: string;
	} | null;
	if (!body) error(400, 'Invalid JSON');

	// ── Load current folder ────────────────────────────────────────────────────
	const [current] = await db.select().from(folders).where(eq(folders.id, params.id)).limit(1);
	if (!current) error(404, 'Folder not found');

	// Resolve new parentId (may be unchanged)
	const newParentId: string | null = 'parentId' in body ? (body.parentId ?? null) : current.parentId;

	// ── Cycle prevention ───────────────────────────────────────────────────────
	if (newParentId) {
		if (newParentId === params.id) error(400, 'A folder cannot be its own parent');
		const descendants = await descendantIds(params.id);
		if (descendants.includes(newParentId)) {
			error(400, 'Moving a folder into one of its own descendants would create a cycle');
		}
	}

	// ── Resolve parent path ────────────────────────────────────────────────────
	let parentPath: string | null = null;
	if (newParentId) {
		const [parent] = await db.select({ path: folders.path })
			.from(folders).where(eq(folders.id, newParentId)).limit(1);
		if (!parent) error(404, 'Parent folder not found');
		parentPath = parent.path;
	}

	// ── Sibling name uniqueness ────────────────────────────────────────────────
	const newPath = buildPath(parentPath, current.name);
	if (newPath !== current.path) {
		const [conflict] = await db.select({ id: folders.id }).from(folders)
			.where(and(eq(folders.path, newPath), ne(folders.id, params.id))).limit(1);
		if (conflict) error(409, `A folder named "${current.name}" already exists at that level`);
	}

	// ── Determine new sort_order ───────────────────────────────────────────────
	// Load current siblings in their current order (we'll renumber after the move)
	const siblings = await db.select({ id: folders.id, sortOrder: folders.sortOrder })
		.from(folders)
		.where(
			and(
				newParentId ? eq(folders.parentId, newParentId) : isNull(folders.parentId),
				ne(folders.id, params.id)   // exclude the folder being moved
			)
		)
		.orderBy(asc(folders.sortOrder), asc(folders.path));

	let newSortOrder: number;

	if (body.beforeId) {
		const idx = siblings.findIndex(s => s.id === body.beforeId);
		if (idx === -1) {
			// beforeId not found among siblings — just append
			newSortOrder = (siblings[siblings.length - 1]?.sortOrder ?? 0) + 10;
		} else if (idx === 0) {
			newSortOrder = (siblings[0].sortOrder ?? 10) - 5; // prepend
		} else {
			const prev = siblings[idx - 1].sortOrder ?? 0;
			const next = siblings[idx].sortOrder ?? 0;
			newSortOrder = Math.round((prev + next) / 2);
		}
	} else if (body.afterId) {
		const idx = siblings.findIndex(s => s.id === body.afterId);
		if (idx === -1 || idx === siblings.length - 1) {
			newSortOrder = (siblings[siblings.length - 1]?.sortOrder ?? 0) + 10;
		} else {
			const prev = siblings[idx].sortOrder ?? 0;
			const next = siblings[idx + 1].sortOrder ?? 0;
			newSortOrder = Math.round((prev + next) / 2);
		}
	} else {
		// Append last
		newSortOrder = (siblings[siblings.length - 1]?.sortOrder ?? 0) + 10;
	}

	// ── Write to DB ────────────────────────────────────────────────────────────
	const [updated] = await db.update(folders)
		.set({ parentId: newParentId, path: newPath, sortOrder: newSortOrder })
		.where(eq(folders.id, params.id))
		.returning();
	if (!updated) error(404, 'Folder not found');

	// Recalculate paths for entire subtree when parent changed
	await recalcSubtree(params.id, newPath, current.path);

	// Re-number siblings so gaps don't collapse to 0 over time
	await renumberSiblings(newParentId);

	return json(updated);
};
