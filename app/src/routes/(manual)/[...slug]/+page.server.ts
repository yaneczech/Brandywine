import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { manualPages, manualBlocks, colors, colorPalettes, typographyFonts, typographyStyles, typographyFontFiles, assets } from '$lib/db/schema';
import { eq, asc, inArray, and } from 'drizzle-orm';
import { pagePreviews } from '$server/page-previews';

export const load: PageServerLoad = async ({ params }) => {
	// slug = 'loga' or 'loga/pouziti' etc.
	const segments = params.slug.split('/').filter(Boolean);

	// One query for all candidate pages, then walk the tree in memory
	const candidates = segments.length
		? await db
			.select()
			.from(manualPages)
			.where(inArray(manualPages.slug, segments))
		: [];

	let parentId: string | null = null;
	let page = null;

	for (const segment of segments) {
		const match = candidates.find(p =>
			p.slug === segment &&
			p.parentId === parentId &&
			p.enabled &&
			!p.isLanding
		);

		if (!match) error(404, `Page not found: /${segments.join('/')}`);
		parentId = match.id;
		page = match;
	}

	if (!page) error(404, 'Page not found');

	const pageId = page.id;
	const [blocks, childPages] = await Promise.all([
		db
			.select()
			.from(manualBlocks)
			.where(and(eq(manualBlocks.pageId, pageId), eq(manualBlocks.enabled, true)))
			.orderBy(asc(manualBlocks.sortOrder)),
		db
			.select({
				id: manualPages.id, title: manualPages.title, slug: manualPages.slug,
				description: manualPages.description, featureImage: manualPages.featureImage,
				bgColor: manualPages.bgColor, textColor: manualPages.textColor,
			})
			.from(manualPages)
			.where(and(eq(manualPages.parentId, pageId), eq(manualPages.enabled, true)))
			.orderBy(asc(manualPages.sortOrder), asc(manualPages.title)),
	]);

	const needsColors = blocks.some(b => b.type === 'colors' || b.type === 'color_ratio' || b.type === 'contrast_checker');
	const needsTypo   = blocks.some(b => b.type === 'typography' || b.type === 'text_styles' || b.type === 'font_usage');
	const needsAssets = blocks.some(b => ['image_gallery', 'carousel', 'icons', 'asset_gallery', 'download'].includes(b.type));

	const [colorRows, paletteRows, fontRows, styleRows, fontFileRows, assetRows] = await Promise.all([
		needsColors ? db.select().from(colors).orderBy(asc(colors.order)) : Promise.resolve([]),
		needsColors ? db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFonts).orderBy(asc(typographyFonts.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyStyles).orderBy(asc(typographyStyles.order)) : Promise.resolve([]),
		needsTypo   ? db.select().from(typographyFontFiles) : Promise.resolve([]),
		needsAssets ? db.select({
			id: assets.id, filename: assets.filename, mime: assets.mime, size: assets.size,
			storagePath: assets.storagePath, thumbnailPath: assets.thumbnailPath,
			folderId: assets.folderId, tags: assets.tags
		}).from(assets).orderBy(asc(assets.filename)) : Promise.resolve([]),
	]);

	const previews = await pagePreviews(childPages.map(p => p.id));

	return { page, blocks, childPages, previews, colorRows, paletteRows, fontRows, styleRows, fontFileRows, assetRows };
};
