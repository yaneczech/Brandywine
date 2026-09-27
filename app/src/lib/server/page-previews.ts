/**
 * Auto-generated card previews for manual pages that have no feature image.
 * A page about colours shows its palette, a typography page shows "Aa" in the
 * brand font and a logo page shows the logo — derived from the page's blocks.
 */
import { colorsForSource } from '$lib/manual/color-source';
import { db } from '$lib/db';
import { manualBlocks, colors, colorPalettes, typographyFonts } from '$lib/db/schema';
import { and, asc, eq, inArray } from 'drizzle-orm';

export type PagePreview =
	| { kind: 'colors'; swatches: string[] }
	| { kind: 'type'; fontName: string | null }
	| { kind: 'image'; src: string; contain: boolean }
	| null;

const TYPE_BLOCKS = new Set(['typography', 'text_styles', 'font_usage']);

export async function pagePreviews(pageIds: string[]): Promise<Record<string, PagePreview>> {
	if (!pageIds.length) return {};

	const blocks = await db
		.select({ pageId: manualBlocks.pageId, type: manualBlocks.type, config: manualBlocks.config })
		.from(manualBlocks)
		.where(and(inArray(manualBlocks.pageId, pageIds), eq(manualBlocks.enabled, true)))
		.orderBy(asc(manualBlocks.sortOrder));

	const byPage = new Map<string, typeof blocks>();
	for (const block of blocks) {
		const list = byPage.get(block.pageId) ?? [];
		list.push(block);
		byPage.set(block.pageId, list);
	}

	const needsColors = blocks.some((b) => b.type === 'colors' || b.type === 'color_ratio');
	const needsFonts = blocks.some((b) => TYPE_BLOCKS.has(b.type));
	const [colorRows, fontRows, palettes] = await Promise.all([
		needsColors ? db.select({ id: colors.id, hex: colors.hex, paletteId: colors.paletteId }).from(colors).orderBy(asc(colors.order)) : Promise.resolve([]),
		needsFonts ? db.select({ id: typographyFonts.id, name: typographyFonts.name }).from(typographyFonts).orderBy(asc(typographyFonts.order)) : Promise.resolve([]),
		needsColors ? db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)) : Promise.resolve([]),
	]);

	const out: Record<string, PagePreview> = {};
	for (const id of pageIds) {
		const list = byPage.get(id) ?? [];
		out[id] = null;
		for (const block of list) {
			const cfg = (block.config ?? {}) as Record<string, unknown>;
			if (block.type === 'logo_spec' && typeof cfg.logoUrl === 'string' && cfg.logoUrl) {
				out[id] = { kind: 'image', src: cfg.logoUrl, contain: true };
				break;
			}
			if (block.type === 'colors' || block.type === 'color_ratio') {
				const swatches = block.type === 'colors'
					? colorsForSource(colorRows, palettes, cfg.source).map(c => c.hex)
					: (Array.isArray(cfg.items) ? cfg.items : []).flatMap(item => {
						const hex = colorRows.find(c => c.id === item?.colorId)?.hex ?? item?.hex;
						return typeof hex === 'string' && /^#[0-9a-f]{6}$/i.test(hex) && Number(item?.percent) > 0 ? [hex] : [];
					});
				if (swatches.length) {
					out[id] = { kind: 'colors', swatches: swatches.slice(0, 6) };
					break;
				}
			}
			if (TYPE_BLOCKS.has(block.type)) {
				const selected = block.type === 'font_usage'
					? (Array.isArray(cfg.rows) ? cfg.rows : []).flatMap(row => Array.isArray(row?.fontIds) ? row.fontIds : [])
					: Array.isArray(cfg.fontIds) ? cfg.fontIds : [];
				const font = selected.length ? fontRows.find(f => selected.includes(f.id)) : fontRows[0];
				out[id] = { kind: 'type', fontName: font?.name ?? null };
				break;
			}
			if (block.type === 'image' && typeof cfg.url === 'string' && cfg.url) {
				out[id] = { kind: 'image', src: cfg.url, contain: cfg.frame === true };
				break;
			}
		}
	}
	return out;
}
