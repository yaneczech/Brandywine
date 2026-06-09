import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { manualPages, manualBlocks, colors, colorPalettes, typographyFonts, typographyStyles, typographyFontFiles } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// Load the landing page and its blocks
	const [landing] = await db
		.select()
		.from(manualPages)
		.where(eq(manualPages.isLanding, true));

	const allBlocks = landing
		? await db.select().from(manualBlocks)
			.where(eq(manualBlocks.pageId, landing.id))
			.orderBy(asc(manualBlocks.sortOrder))
		: [];
	// Skip blocks with empty config — they have no renderable content
	const blocks = allBlocks.filter(b => b.config && Object.keys(b.config).length > 0);

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
			featureImage: manualPages.featureImage,
			bgColor: manualPages.bgColor,
			textColor: manualPages.textColor,
		})
		.from(manualPages)
		.where(eq(manualPages.enabled, true))
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	const needsColors = blocks.some(b => b.type === 'colors');
	const needsTypo   = blocks.some(b => b.type === 'typography' || b.type === 'text_styles');

	const [colorRows, paletteRows, fontRows, styleRows, fontFileRows] = await Promise.all([
		needsColors ? db.select().from(colors).orderBy(asc(colors.order)) : Promise.resolve([]),
		needsColors ? db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFonts).orderBy(asc(typographyFonts.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyStyles).orderBy(asc(typographyStyles.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFontFiles) : Promise.resolve([]),
	]);

	return { landing: landing ?? null, blocks, pages, colorRows, paletteRows, fontRows, styleRows, fontFileRows };
};
