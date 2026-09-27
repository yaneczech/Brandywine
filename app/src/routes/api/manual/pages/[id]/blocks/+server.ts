import { canEdit } from '$server/permissions';
/**
 * GET  /api/manual/pages/[id]/blocks  — list blocks for a page (ordered)
 * POST /api/manual/pages/[id]/blocks  — add a new block
 */
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages, manualBlocks } from '$db/schema';
import { eq, asc, max } from 'drizzle-orm';
import { BLOCK_TYPES } from '$lib/blocks';
import { createId } from '$lib/db/id';
import { emit } from '$server/events';

// ── GET ────────────────────────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const blocks = await db
		.select()
		.from(manualBlocks)
		.where(eq(manualBlocks.pageId, params.id))
		.orderBy(asc(manualBlocks.sortOrder));

	return json(blocks);
};

// ── POST ───────────────────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	// Verify page exists
	const [page] = await db.select({ id: manualPages.id }).from(manualPages).where(eq(manualPages.id, params.id));
	if (!page) error(404, 'Page not found');

	const body = await request.json() as {
		type: string;
		config?: Record<string, unknown>;
		anchor?: string;
		afterId?: string; // insert after this block id
	};

	if (!body.type) error(400, 'type is required');
	if (!BLOCK_TYPES.includes(body.type)) {
		error(400, `Unknown block type: ${body.type}. Valid types: ${BLOCK_TYPES.join(', ')}`);
	}

	// Determine sortOrder
	let sortOrder: number;
	if (body.afterId) {
		const [after] = await db.select({ sortOrder: manualBlocks.sortOrder })
			.from(manualBlocks).where(eq(manualBlocks.id, body.afterId));
		if (after) {
			// Find the next block's sortOrder
			const siblings = await db.select({ sortOrder: manualBlocks.sortOrder })
				.from(manualBlocks)
				.where(eq(manualBlocks.pageId, params.id))
				.orderBy(asc(manualBlocks.sortOrder));
			const idx = siblings.findIndex(s => s.sortOrder > after.sortOrder);
			if (idx === -1) {
				sortOrder = after.sortOrder + 10;
			} else {
				sortOrder = Math.round((after.sortOrder + siblings[idx].sortOrder) / 2);
				// If no gap, renumber after insert
			}
		} else {
			sortOrder = await appendSortOrder(params.id);
		}
	} else {
		sortOrder = await appendSortOrder(params.id);
	}

	const [block] = await db
		.insert(manualBlocks)
		.values({
			id: createId(),
			pageId: params.id,
			type: body.type,
			config: body.config ?? {},
			anchor: body.anchor ?? null,
			sortOrder,
		})
		.returning();

	// Renumber to restore clean gaps
	await renumberBlocks(params.id);
	const [fresh] = await db.select().from(manualBlocks).where(eq(manualBlocks.id, block.id));

	emit('block.saved', { block: { id: fresh.id, pageId: fresh.pageId, type: fresh.type }, created: true, userId: locals.user.id });
	return json(fresh, { status: 201 });
};

// ── helpers ────────────────────────────────────────────────────────────────────
async function appendSortOrder(pageId: string): Promise<number> {
	const [result] = await db.select({ max: max(manualBlocks.sortOrder) })
		.from(manualBlocks).where(eq(manualBlocks.pageId, pageId));
	return (result?.max ?? 0) + 10;
}

async function renumberBlocks(pageId: string): Promise<void> {
	const blocks = await db.select({ id: manualBlocks.id })
		.from(manualBlocks)
		.where(eq(manualBlocks.pageId, pageId))
		.orderBy(asc(manualBlocks.sortOrder));
	for (let i = 0; i < blocks.length; i++) {
		await db.update(manualBlocks)
			.set({ sortOrder: (i + 1) * 10 })
			.where(eq(manualBlocks.id, blocks[i].id));
	}
}
