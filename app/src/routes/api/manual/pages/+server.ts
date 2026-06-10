/**
 * GET  /api/manual/pages  — full page tree (flat list, sorted by sort_order)
 * POST /api/manual/pages  — create a new page
 */
import { canEdit } from '$server/permissions';
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages } from '$db/schema';
import { asc, isNull, eq } from 'drizzle-orm';

// ── GET — return all pages (admin builds the tree client-side) ─────────────────
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const pages = await db
		.select()
		.from(manualPages)
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	return json(pages);
};

// ── POST — create page ─────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') error(400, 'Invalid JSON');

	const { parentId = null, title, slug, description } = body as {
		parentId?: string | null;
		title: string;
		slug: string;
		description?: string;
	};

	if (!title?.trim()) error(400, 'title is required');
	if (!slug?.trim()) error(400, 'slug is required');
	if (!/^[a-z0-9-]+$/.test(slug)) error(400, 'slug must be lowercase letters, numbers and hyphens');

	// Single query: fetch siblings for both uniqueness check and sortOrder
	const siblings = await db
		.select({ id: manualPages.id, slug: manualPages.slug, sortOrder: manualPages.sortOrder })
		.from(manualPages)
		.where(parentId ? eq(manualPages.parentId, parentId) : isNull(manualPages.parentId));

	if (siblings.some(s => s.slug === slug)) {
		error(409, 'A page with this slug already exists at this level');
	}

	const maxSortOrder = siblings.reduce((m, s) => Math.max(m, s.sortOrder), 0);
	const sortOrder = maxSortOrder + 10;

	const [page] = await db
		.insert(manualPages)
		.values({
			parentId: parentId ?? null,
			title: title.trim(),
			slug: slug.trim(),
			description: description?.trim() ?? null,
			sortOrder,
		})
		.returning();

	return json(page, { status: 201 });
};
