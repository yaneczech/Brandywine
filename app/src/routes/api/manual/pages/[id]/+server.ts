import { canEdit } from '$server/permissions';
/**
 * GET    /api/manual/pages/[id]  — single page
 * PATCH  /api/manual/pages/[id]  — update title / slug / description / enabled / sortOrder / parentId
 * DELETE /api/manual/pages/[id]  — delete (cascades blocks)
 */
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages } from '$db/schema';
import { eq, isNull, and, ne } from 'drizzle-orm';
import { emit } from '$server/events';

// ── GET ────────────────────────────────────────────────────────────────────────
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const [page] = await db.select().from(manualPages).where(eq(manualPages.id, params.id));
	if (!page) error(404, 'Page not found');
	return json(page);
};

// ── PATCH ──────────────────────────────────────────────────────────────────────
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const [existing] = await db.select().from(manualPages).where(eq(manualPages.id, params.id));
	if (!existing) error(404, 'Page not found');

	const body = await request.json() as Partial<{
		title: string;
		slug: string;
		description: string | null;
		enabled: boolean;
		sortOrder: number;
		parentId: string | null;
		featureImage: string | null;
		cardImage: string | null;
		heroBgSize: string | null;
		bgColor: string | null;
		textColor: string | null;
		subpagesPosition: 'start' | 'end';
	}>;

	// Slug uniqueness check if slug or parentId changed
	const newSlug = body.slug ?? existing.slug;
	const newParentId = 'parentId' in body ? body.parentId : existing.parentId;
	if (newSlug !== existing.slug || newParentId !== existing.parentId) {
		if (!/^[a-z0-9-]*$/.test(newSlug)) error(400, 'slug must be lowercase letters, numbers and hyphens');
		const siblings = await db
			.select({ id: manualPages.id, slug: manualPages.slug })
			.from(manualPages)
			.where(
				newParentId
					? and(eq(manualPages.parentId, newParentId), ne(manualPages.id, params.id))
					: and(isNull(manualPages.parentId), ne(manualPages.id, params.id))
			);
		if (siblings.some(s => s.slug === newSlug)) {
			error(409, 'A page with this slug already exists at this level');
		}
	}

	const updates: Record<string, unknown> = {
		updatedAt: new Date(),
	};
	if (body.title !== undefined)       updates.title       = body.title.trim();
	if (body.slug !== undefined)        updates.slug        = body.slug.trim();
	if ('description' in body)          updates.description = body.description?.trim() ?? null;
	if (body.enabled !== undefined)     updates.enabled     = body.enabled;
	if (body.sortOrder !== undefined)   updates.sortOrder   = body.sortOrder;
	if ('parentId' in body)             updates.parentId    = body.parentId ?? null;
	if ('featureImage' in body)         updates.featureImage = body.featureImage ?? null;
	if ('cardImage' in body)            updates.cardImage    = body.cardImage?.trim() || null;
	if ('heroBgSize' in body)           updates.heroBgSize   = body.heroBgSize   ?? null;
	if ('bgColor' in body)              updates.bgColor      = body.bgColor ?? null;
	if ('textColor' in body)            updates.textColor    = body.textColor ?? null;
	if (body.subpagesPosition !== undefined) {
		if (body.subpagesPosition !== 'start' && body.subpagesPosition !== 'end') error(400, 'subpagesPosition must be start or end');
		updates.subpagesPosition = body.subpagesPosition;
	}

	const [updated] = await db
		.update(manualPages)
		.set(updates)
		.where(eq(manualPages.id, params.id))
		.returning();

	emit('page.saved', { page: { id: updated.id, title: updated.title, slug: updated.slug, parentId: updated.parentId }, created: false, userId: locals.user.id });
	return json(updated);
};

// ── DELETE ─────────────────────────────────────────────────────────────────────
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const [existing] = await db.select({ id: manualPages.id, title: manualPages.title, isLanding: manualPages.isLanding })
		.from(manualPages).where(eq(manualPages.id, params.id));
	if (!existing) error(404, 'Page not found');
	if (existing.isLanding) error(400, 'Cannot delete the landing page');

	await db.delete(manualPages).where(eq(manualPages.id, params.id));
	emit('page.deleted', { page: { id: existing.id, title: existing.title }, userId: locals.user.id });
	return new Response(null, { status: 204 });
};
