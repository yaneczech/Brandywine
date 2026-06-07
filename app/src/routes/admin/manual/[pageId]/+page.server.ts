import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages, manualBlocks, colors, colorPalettes } from '$db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [page] = await db.select().from(manualPages).where(eq(manualPages.id, params.pageId));
	if (!page) error(404, 'Page not found');

	const [blocks, brandColors] = await Promise.all([
		db.select().from(manualBlocks)
			.where(eq(manualBlocks.pageId, params.pageId))
			.orderBy(asc(manualBlocks.sortOrder)),
		db.select({ id: colors.id, name: colors.name, hex: colors.hex })
			.from(colors)
			.orderBy(asc(colors.order)),
	]);

	return { page, blocks, brandColors };
};
