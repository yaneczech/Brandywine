import * as m from '$lib/paraglide/messages';
/**
 * Manual quality check — finds content problems an editor should fix before
 * sharing the manual: empty blocks, missing alt texts, broken files, empty
 * asset selections, unreadable hero colours and duplicate anchors.
 */
import { colorsForSource } from '$lib/manual/color-source';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { db } from '$db';
import { assets, brandSettings, colors, colorPalettes, manualBlocks, manualPages, typographyFonts } from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { resolveEmbed } from '$lib/manual/embed';
import { contrastRatio } from '$lib/utils/colors';

export type AuditSeverity = 'error' | 'warning' | 'info';
export type AuditIssue = {
	severity: AuditSeverity;
	code: string;
	message: string;
	pageId: string | null;
	pageTitle: string | null;
	blockId: string | null;
	blockType: string | null;
	blockHeading: string | null;
};

const UPLOAD_DIR = env.UPLOAD_DIR ?? './uploads';

function str(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}
function arr<T = Record<string, unknown>>(value: unknown): T[] {
	return Array.isArray(value) ? (value as T[]) : [];
}
function hasText(html: unknown): boolean {
	return str(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}
function richHasContent(config: Record<string, unknown>): boolean {
	return arr<{ html?: unknown }>(config.content).some((item) => hasText(item.html)) || hasText(config.markdown);
}

/** false only when a local upload path points at a file that does not exist */
function fileExists(url: string): boolean {
	if (!url || /^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return true;
	if (!url.startsWith('/uploads/') && url.startsWith('/')) return true; // static app files
	const relative = url.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
	const root = resolve(UPLOAD_DIR);
	const full = resolve(join(root, relative));
	if (!full.startsWith(root + '/')) return false;
	return existsSync(full);
}

export async function auditManual(): Promise<AuditIssue[]> {
	const [pages, blocks, assetRows, colorRows, fontRows, palettes, [settings]] = await Promise.all([
		db.select().from(manualPages).orderBy(asc(manualPages.sortOrder), asc(manualPages.title)),
		db.select().from(manualBlocks).orderBy(asc(manualBlocks.sortOrder)),
		db.select({ id: assets.id, mime: assets.mime, folderId: assets.folderId, tags: assets.tags }).from(assets),
		db.select({ id: colors.id, paletteId: colors.paletteId }).from(colors),
		db.select({ id: typographyFonts.id }).from(typographyFonts),
		db.select().from(colorPalettes),
		db.select().from(brandSettings).where(eq(brandSettings.id, 1)),
	]);

	const issues: AuditIssue[] = [];
	const pageById = new Map(pages.map((p) => [p.id, p]));

	function add(severity: AuditSeverity, code: string, message: string, pageId: string | null, block?: typeof blocks[number]) {
		const page = pageId ? pageById.get(pageId) : null;
		issues.push({
			severity, code, message,
			pageId, pageTitle: page?.title ?? null,
			blockId: block?.id ?? null, blockType: block?.type ?? null,
			blockHeading: block ? str((block.config as Record<string, unknown>)?.heading) || null : null,
		});
	}

	// ── Brand-level ────────────────────────────────────────────────────────
	if (!settings?.logoPath) add('warning', 'brand_no_logo', m.audit_brand_no_logo(), null);
	else if (!fileExists(settings.logoPath.startsWith('/') ? settings.logoPath : `/uploads/${settings.logoPath}`)) {
		add('error', 'brand_logo_missing', m.audit_brand_logo_missing(), null);
	}
	if (!pages.some((p) => p.isLanding && p.enabled)) add('error', 'no_landing', m.audit_no_landing(), null);

	function assetsFor(config: Record<string, unknown>, imagesOnly: boolean) {
		const folderId = str(config.folderId) || null;
		const tags = str(config.tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
		return assetRows.filter((a) =>
			(!imagesOnly || a.mime.startsWith('image/')) &&
			(!folderId || a.folderId === folderId) &&
			(!tags.length || tags.every((t) => (a.tags ?? []).includes(t)))
		);
	}

	// ── Pages ──────────────────────────────────────────────────────────────
	for (const page of pages) {
		if (!page.enabled) continue;
		const pageBlocks = blocks.filter((b) => b.pageId === page.id);
		const children = pages.filter((p) => p.parentId === page.id && p.enabled);

		if (!pageBlocks.some(b => b.enabled) && !children.length && !page.isLanding) {
			add('warning', 'page_empty', m.audit_page_empty(), page.id);
		}
		if (!page.isLanding && !str(page.description)) {
			add('info', 'page_no_description', m.audit_page_no_description(), page.id);
		}
		if (page.featureImage && !fileExists(page.featureImage)) {
			add('error', 'page_image_missing', m.audit_page_image_missing(), page.id);
		}
		if (page.bgColor && page.textColor) {
			try {
				const ratio = contrastRatio(page.bgColor, page.textColor);
				if (ratio < 4.5) add('warning', 'page_contrast', m.audit_page_contrast({ ratio: ratio.toFixed(1) }), page.id);
			} catch { /* invalid colour — ignore */ }
		}

		// Duplicate anchors break the table of contents and deep links
		const anchors = new Map<string, number>();
		for (const b of pageBlocks.filter(b => b.enabled)) {
			const cfg = (b.config ?? {}) as Record<string, unknown>;
			const anchor = b.anchor || str(cfg.heading).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
			if (anchor) anchors.set(anchor, (anchors.get(anchor) ?? 0) + 1);
		}
		for (const [anchor, count] of anchors) {
			if (count > 1) add('warning', 'duplicate_anchor', m.audit_duplicate_anchor({ anchor, count: String(count) }), page.id);
		}

		// ── Blocks ─────────────────────────────────────────────────────────
		for (const block of pageBlocks) {
			const c = (block.config ?? {}) as Record<string, unknown>;
			const empty = (msg = m.audit_block_empty()) => add('error', 'block_empty', msg, page.id, block);
			const missingAlt = () => add('warning', 'missing_alt', m.audit_missing_alt(), page.id, block);
			const broken = (what: string) => add('error', 'file_missing', m.audit_file_missing({ what }), page.id, block);

			if (!block.enabled) {
				add('info', 'block_hidden', m.audit_block_hidden(), page.id, block);
				continue;
			}

			switch (block.type) {
				case 'rich_text':
					if (!richHasContent(c)) empty();
					break;
				case 'image':
					if (!str(c.url)) empty();
					else {
						if (!fileExists(str(c.url))) broken(m.audit_what_image());
						if (!str(c.alt)) missingAlt();
					}
					break;
				case 'text_image':
					if (!richHasContent(c) && !str(c.title) && !str(c.imageUrl)) empty();
					if (str(c.imageUrl)) {
						if (!fileExists(str(c.imageUrl))) broken(m.audit_what_image());
						if (!str(c.alt)) missingAlt();
					}
					if (str(c.ctaLabel) && !str(c.ctaUrl)) add('warning', 'cta_no_url', m.audit_cta_no_url(), page.id, block);
					break;
				case 'hotspots':
					if (!str(c.imageUrl)) empty();
					else {
						if (!fileExists(str(c.imageUrl))) broken(m.audit_what_image());
						if (!str(c.alt)) missingAlt();
						if (!arr(c.points).length) add('warning', 'hotspots_none', m.audit_hotspots_none(), page.id, block);
					}
					break;
				case 'before_after':
					if (!str(c.beforeUrl) || !str(c.afterUrl)) empty(m.audit_compare_missing());
					else if (!fileExists(str(c.beforeUrl)) || !fileExists(str(c.afterUrl))) broken(m.audit_what_compare_image());
					break;
				case 'logo_spec':
					if (!str(c.logoUrl)) empty();
					else if (!fileExists(str(c.logoUrl))) broken(m.audit_what_logo());
					break;
				case 'logo_download': {
					const variants = arr<{ url?: string; files?: { url?: string }[] }>(c.variants).filter((v) => str(v.url));
					if (!variants.length) empty(m.audit_no_logo_variant());
					for (const v of variants) {
						if (!fileExists(str(v.url))) broken(m.audit_what_logo_file({ name: str(v.url).split('/').pop() ?? '' }));
						for (const f of v.files ?? []) if (str(f.url) && !fileExists(str(f.url))) broken(m.audit_what_file({ name: str(f.url).split('/').pop() ?? '' }));
					}
					break;
				}
				case 'do_dont': case 'accordion': case 'stats': case 'links': case 'color_ratio':
					if (!arr(c.items).length) empty();
					if (block.type === 'links' && arr<{ url?: string }>(c.items).some((i) => !str(i.url))) {
						add('warning', 'link_no_url', m.audit_link_no_url(), page.id, block);
					}
					if (block.type === 'do_dont') {
						for (const item of arr<{ imageUrl?: string }>(c.items)) {
							if (str(item.imageUrl) && !fileExists(str(item.imageUrl))) broken(m.audit_what_item_image());
						}
					}
					break;
				case 'process':
					if (!arr(c.steps).length) empty();
					break;
				case 'cards':
					if (!arr(c.cards).length) empty();
					break;
				case 'table':
					if (!arr(c.headers).length && !arr(c.rows).length) empty();
					break;
				case 'font_usage':
					if (!arr(c.rows).length) empty();
					if (!fontRows.length) add('warning', 'no_fonts', m.audit_no_fonts(), page.id, block);
					break;
				case 'quote':
					if (!str(c.quote)) empty();
					break;
				case 'callout':
					if (!str(c.title) && !str(c.text)) empty();
					break;
				case 'code':
					if (!str(c.code)) empty();
					break;
				case 'html':
					if (!str(c.html)) empty();
					break;
				case 'naming':
					if (!str(c.markdown)) empty();
					break;
				case 'chart':
					if (!str(c.data)) empty();
					break;
				case 'embed':
					if (!str(c.url)) empty();
					else if (resolveEmbed(c.url).kind === 'none') add('warning', 'embed_unsupported', m.audit_embed_unsupported(), page.id, block);
					break;
				case 'colors':
					if (!colorsForSource(colorRows, palettes, c.source).length) add('warning', 'no_colors', m.audit_no_colors(), page.id, block);
					break;
				case 'typo_rules':
					if (!arr<{ rules?: unknown }>(c.languages).some(lang => arr(lang.rules).length)) empty(m.audit_no_typo_rules());
					break;
				case 'typography': case 'text_styles':
					if (!fontRows.length) add('warning', 'no_fonts', m.audit_no_fonts(), page.id, block);
					break;
				case 'image_gallery': case 'carousel': case 'icons':
					if (!str(c.folderId)) empty(m.audit_no_folder());
					else if (!assetsFor(c, true).length) add('warning', 'no_assets', m.audit_folder_no_images(), page.id, block);
					break;
				case 'asset_gallery': case 'download':
					if (!assetsFor(c, false).length) add('warning', 'no_assets', m.audit_selection_no_files(), page.id, block);
					break;
			}
		}
	}

	const order: Record<AuditSeverity, number> = { error: 0, warning: 1, info: 2 };
	return issues.sort((a, b) => order[a.severity] - order[b.severity]);
}
