import type { PageServerLoad } from './$types';
import { db } from '$lib/db';
import { manualPages, manualBlocks, colors, colorPalettes, typographyFonts, typographyStyles, typographyFontFiles, assets } from '$lib/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { isLandingBlockVisible } from '$lib/blocks';
import { pagePreviews } from '$server/page-previews';
import { renderRuntimeBlocks } from '$server/runtime-plugins';

export const load: PageServerLoad = async () => {
	// Landing page lookup and the page tree are independent — run in parallel
	const [[landing], pages] = await Promise.all([
		db
			.select()
			.from(manualPages)
			.where(and(eq(manualPages.isLanding, true), eq(manualPages.enabled, true))),
		db
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
				cardImage: manualPages.cardImage,
				bgColor: manualPages.bgColor,
				textColor: manualPages.textColor,
			})
			.from(manualPages)
			.where(eq(manualPages.enabled, true))
			.orderBy(asc(manualPages.sortOrder), asc(manualPages.title)),
	]);

	const allBlocks = landing
		? await db.select().from(manualBlocks)
			.where(eq(manualBlocks.pageId, landing.id))
			.orderBy(asc(manualBlocks.sortOrder))
		: [];
	// Dynamic blocks and dividers are valid with their default (empty) config.
	const blocks = allBlocks.filter(isLandingBlockVisible);

	const needsColors = blocks.some(b => b.type === 'colors' || b.type === 'color_ratio' || b.type === 'contrast_checker');
	const needsTypo   = blocks.some(b => b.type === 'typography' || b.type === 'text_styles' || b.type === 'font_usage');
	const needsAssets = blocks.some(b => ['image_gallery', 'carousel', 'icons', 'asset_gallery', 'download'].includes(b.type));

	const [colorRows, paletteRows, fontRows, styleRows, fontFileRows, assetRows] = await Promise.all([
		needsColors ? db.select().from(colors).orderBy(asc(colors.order), asc(colors.name)) : Promise.resolve([]),
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

	const topLevelIds = pages.filter(p => !p.isLanding && !p.parentId).map(p => p.id);
	const previews = await pagePreviews(topLevelIds);

	// HTML of blocks from runtime plugins, rendered by the plugins on the server
	const runtimeHtml = await renderRuntimeBlocks(blocks);
	return { landing: landing ?? null, blocks, pages, previews, colorRows, paletteRows, fontRows, styleRows, fontFileRows, assetRows, runtimeHtml };
};
