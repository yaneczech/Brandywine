/**
 * GET  /api/manual/pages  — full page tree (flat list, sorted by sort_order)
 * POST /api/manual/pages  — create a new page
 */
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages } from '$db/schema';
import { asc, isNull, eq } from 'drizzle-orm';
import { createId } from '$lib/db/id';

// ── GET — return all pages (admin builds the tree client-side) ─────────────────
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const pages = await db
		.select()
		.from(manualPages)
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	return json(pages);
};

// ── POST — create page ─────────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (locals.user.role !== 'admin') error(403, 'Forbidden');

	const body = await request.json();
	const { parentId = null, title, slug, description } = body as {
		parentId?: string | null;
		title: string;
		slug: string;
		description?: string;
	};

	if (!title?.trim()) error(400, 'title is required');
	if (!slug?.trim()) error(400, 'slug is required');
	if (!/^[a-z0-9-]+$/.test(slug)) error(400, 'slug must be lowercase letters, numbers and hyphens');

	// Check slug uniqueness within same parent
	const existing = await db
		.select({ id: manualPages.id })
		.from(manualPages)
		.where(
			parentId
				? eq(manualPages.parentId, parentId)
				: isNull(manualPages.parentId)
		)
		.then(rows => rows);

	// Use slug filter manually (drizzle doesn't have a simple AND with dynamic null check)
	const duplicate = await db
		.select({ id: manualPages.id })
		.from(manualPages)
		.where(eq(manualPages.slug, slug))
		.then(rows => rows.filter(r => {
			// We need to check in JS since we can't easily do COALESCE in where
			return true; // will validate differently below
		}));

	// Proper duplicate check via raw query helper
	const siblings = await db
		.select({ id: manualPages.id, slug: manualPages.slug })
		.from(manualPages)
		.where(parentId ? eq(manualPages.parentId, parentId) : isNull(manualPages.parentId));

	if (siblings.some(s => s.slug === slug)) {
		error(409, 'A page with this slug already exists at this level');
	}

	// Determine sort_order (append last)
	const maxOrder = siblings.reduce((m, s) => Math.max(m, 0), 0);
	const sortOrder = (siblings.length + 1) * 10;

	const [page] = await db
		.insert(manualPages)
		.values({
			id: createId(),
			parentId: parentId ?? null,
			title: title.trim(),
			slug: slug.trim(),
			description: description?.trim() ?? null,
			sortOrder,
		})
		.returning();

	return json(page, { status: 201 });
};
