/**
 * PATCH  /api/manual/blocks/[id]  — update config / anchor / enabled / move (sortOrder)
 * DELETE /api/manual/blocks/[id]  — remove block
 */
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { manualBlocks } from '$db/schema';
import { eq, asc, and, ne } from 'drizzle-orm';

// ── PATCH ──────────────────────────────────────────────────────────────────────
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const [existing] = await db.select().from(manualBlocks).where(eq(manualBlocks.id, params.id));
	if (!existing) error(404, 'Block not found');

	const body = await request.json() as Partial<{
		config: Record<string, unknown>;
		anchor: string | null;
		enabled: boolean;
		sortOrder: number;
		// Reorder helpers
		beforeId: string;
		afterId: string;
	}>;

	const updates: Record<string, unknown> = { updatedAt: new Date() };

	if (body.config !== undefined)  updates.config  = body.config;
	if ('anchor' in body)           updates.anchor  = body.anchor ?? null;
	if (body.enabled !== undefined) updates.enabled = body.enabled;

	// Reorder: place before/after another block in the same page
	if (body.beforeId || body.afterId) {
		const siblings = await db
			.select({ id: manualBlocks.id, sortOrder: manualBlocks.sortOrder })
			.from(manualBlocks)
			.where(and(eq(manualBlocks.pageId, existing.pageId), ne(manualBlocks.id, params.id)))
			.orderBy(asc(manualBlocks.sortOrder));

		if (body.beforeId) {
			const idx = siblings.findIndex(s => s.id === body.beforeId);
			if (idx === -1) error(400, 'beforeId not found in same page');
			const prev = siblings[idx - 1];
			updates.sortOrder = prev
				? Math.round((prev.sortOrder + siblings[idx].sortOrder) / 2)
				: siblings[idx].sortOrder - 5;
		} else if (body.afterId) {
			const idx = siblings.findIndex(s => s.id === body.afterId);
			if (idx === -1) error(400, 'afterId not found in same page');
			const next = siblings[idx + 1];
			updates.sortOrder = next
				? Math.round((siblings[idx].sortOrder + next.sortOrder) / 2)
				: siblings[idx].sortOrder + 10;
		}
	} else if (body.sortOrder !== undefined) {
		updates.sortOrder = body.sortOrder;
	}

	const [updated] = await db
		.update(manualBlocks)
		.set(updates)
		.where(eq(manualBlocks.id, params.id))
		.returning();

	// Renumber if we repositioned
	if (body.beforeId || body.afterId) {
		await renumberBlocks(existing.pageId);
		const [fresh] = await db.select().from(manualBlocks).where(eq(manualBlocks.id, params.id));
		return json(fresh);
	}

	return json(updated);
};

// ── DELETE ─────────────────────────────────────────────────────────────────────
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const [existing] = await db.select({ id: manualBlocks.id, pageId: manualBlocks.pageId })
		.from(manualBlocks).where(eq(manualBlocks.id, params.id));
	if (!existing) error(404, 'Block not found');

	await db.delete(manualBlocks).where(eq(manualBlocks.id, params.id));
	await renumberBlocks(existing.pageId);

	return new Response(null, { status: 204 });
};

// ── helpers ────────────────────────────────────────────────────────────────────
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
