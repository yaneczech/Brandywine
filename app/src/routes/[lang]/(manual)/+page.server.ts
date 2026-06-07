import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { manualPages, manualBlocks } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Load the landing page and its blocks
	const [landing] = await db
		.select()
		.from(manualPages)
		.where(eq(manualPages.isLanding, true));

	const blocks = landing
		? await db.select().from(manualBlocks)
			.where(eq(manualBlocks.pageId, landing.id))
			.orderBy(asc(manualBlocks.sortOrder))
		: [];

	const pages = await db
		.select({
			id: manualPages.id,
			parentId: manualPages.parentId,
			title: manualPages.title,
			slug: manualPages.slug,
			description: manualPages.description,
			sortOrder: manualPages.sortOrder,
			enabled: manualPages.enabled,
			isLanding: manualPages.isLanding,
		})
		.from(manualPages)
		.where(eq(manualPages.enabled, true))
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	return { landing: landing ?? null, blocks, pages };
};
