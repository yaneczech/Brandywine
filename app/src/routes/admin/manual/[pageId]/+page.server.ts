import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$db';
import { manualPages, manualBlocks, colors, colorPalettes, typographyFonts } from '$db/schema';
import { eq, asc } from 'drizzle-orm';
import { manualPagePath } from '$lib/manual/paths';

export const load: PageServerLoad = async ({ params }) => {
	const [page] = await db.select().from(manualPages).where(eq(manualPages.id, params.pageId));
	if (!page) error(404, 'Page not found');

	const [blocks, brandColors, brandFonts, brandPalettes, allPages] = await Promise.all([
		db.select().from(manualBlocks)
			.where(eq(manualBlocks.pageId, params.pageId))
			.orderBy(asc(manualBlocks.sortOrder)),
		db.select({ id: colors.id, name: colors.name, hex: colors.hex })
			.from(colors)
			.orderBy(asc(colors.order), asc(colors.name)),
		db.select({ id: typographyFonts.id, name: typographyFonts.name })
			.from(typographyFonts)
			.orderBy(asc(typographyFonts.order)),
		db.select({ id: colorPalettes.id, name: colorPalettes.name }).from(colorPalettes).orderBy(asc(colorPalettes.order)),
		db.select({ id: manualPages.id, parentId: manualPages.parentId, slug: manualPages.slug, isLanding: manualPages.isLanding }).from(manualPages),
	]);

	// Where the page lives in the public manual ("View" link)
	const publicPath = manualPagePath(page, allPages);

	return { page, blocks, brandColors, brandFonts, brandPalettes, publicPath };
};
