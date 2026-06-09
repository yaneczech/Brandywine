import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { manualPages, manualBlocks, colors, colorPalettes, typographyFonts, typographyStyles, typographyFontFiles } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	// slug = 'loga' or 'loga/pouziti' etc.
	const segments = params.slug.split('/').filter(Boolean);

	// Walk the tree: find the page matching the slug path
	let parentId: string | null = null;
	let page = null;

	for (const segment of segments) {
		const all = await db
			.select()
			.from(manualPages)
			.where(eq(manualPages.slug, segment))
			.orderBy(asc(manualPages.sortOrder));

		// Filter by parent
		const match = all.find(p =>
			p.parentId === parentId &&
			p.enabled &&
			!p.isLanding
		);

		if (!match) error(404, `Page not found: /${segments.join('/')}`);
		parentId = match.id;
		page = match;
	}

	if (!page) error(404, 'Page not found');

	const blocks = await db
		.select()
		.from(manualBlocks)
		.where(eq(manualBlocks.pageId, page.id))
		.orderBy(asc(manualBlocks.sortOrder));

	const needsColors = blocks.some(b => b.type === 'colors');
	const needsTypo   = blocks.some(b => b.type === 'typography' || b.type === 'text_styles');

	const [colorRows, paletteRows, fontRows, styleRows, fontFileRows] = await Promise.all([
		needsColors ? db.select().from(colors).orderBy(asc(colors.order)) : Promise.resolve([]),
		needsColors ? db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFonts).orderBy(asc(typographyFonts.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyStyles).orderBy(asc(typographyStyles.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFontFiles) : Promise.resolve([]),
	]);

	return { page, blocks, colorRows, paletteRows, fontRows, styleRows, fontFileRows };
};
