import { colorsForSource } from '$lib/manual/color-source';
import { getBlockDefinition } from '$lib/blocks';
/**
 * Plain-text / Markdown view of the whole manual for AI tools (AI export,
 * llms.txt and the read-only MCP server). Everything here is derived from the
 * published manual — disabled pages and blocks are left out.
 */
import { db } from '$db';
import {
	assets, brandSettings, colorPalettes, colors, manualBlocks, manualPages,
	typographyFonts, typographyStyles,
} from '$db/schema';
import { asc, eq } from 'drizzle-orm';
import { sanitizeRichHtml } from '$lib/utils/sanitize-rich-html';
import { hasManualViewAccess, MANUAL_ACCESS_COOKIE } from '$server/manual-access';
import type { Cookies } from '@sveltejs/kit';

/** Same gate as the public manual, for endpoints outside the manual layout. */
export async function canReadManual(user: App.Locals['user'], cookies: Cookies): Promise<boolean> {
	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return hasManualViewAccess(settings, user, cookies.get(MANUAL_ACCESS_COOKIE));
}

type Page = typeof manualPages.$inferSelect;
type Block = typeof manualBlocks.$inferSelect;
type Color = typeof colors.$inferSelect;

export type ManualSnapshot = {
	brandName: string;
	origin: string;
	pages: Page[];
	blocks: Block[];
	colors: Color[];
	palettes: (typeof colorPalettes.$inferSelect)[];
	fonts: (typeof typographyFonts.$inferSelect)[];
	styles: (typeof typographyStyles.$inferSelect)[];
	assets: { id: string; filename: string; mime: string; storagePath: string; folderId: string | null; tags: string[] | null }[];
};

export async function loadManualSnapshot(origin: string): Promise<ManualSnapshot> {
	const [[settings], pages, blocks, colorRows, palettes, fonts, styles, assetRows] = await Promise.all([
		db.select().from(brandSettings).where(eq(brandSettings.id, 1)),
		db.select().from(manualPages).where(eq(manualPages.enabled, true)).orderBy(asc(manualPages.sortOrder), asc(manualPages.title)),
		db.select().from(manualBlocks).where(eq(manualBlocks.enabled, true)).orderBy(asc(manualBlocks.sortOrder)),
		db.select().from(colors).orderBy(asc(colors.order)),
		db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)),
		db.select().from(typographyFonts).orderBy(asc(typographyFonts.order)),
		db.select().from(typographyStyles).orderBy(asc(typographyStyles.order)),
		db.select({
			id: assets.id, filename: assets.filename, mime: assets.mime, storagePath: assets.storagePath,
			folderId: assets.folderId, tags: assets.tags,
		}).from(assets).orderBy(asc(assets.filename)),
	]);
	return {
		brandName: settings?.name ?? 'Brand',
		origin,
		pages: pages.filter((p) => isReachable(p, pages)),
		blocks, colors: colorRows, palettes, fonts, styles, assets: assetRows,
	};
}

/** A page is public only when its whole ancestor chain is enabled. */
function isReachable(page: Page, enabled: Page[]): boolean {
	let cur: Page | undefined = page;
	for (let depth = 0; cur && depth < 32; depth++) {
		if (!cur.parentId) return true;
		cur = enabled.find((p) => p.id === cur!.parentId);
	}
	return false;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const arr = <T = Record<string, unknown>>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const cell = (v: unknown) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();

function table(headers: string[], rows: unknown[][]): string {
	if (!rows.length) return '';
	return [
		`| ${headers.map(cell).join(' | ')} |`,
		`| ${headers.map(() => '---').join(' | ')} |`,
		...rows.map((r) => `| ${headers.map((_, i) => cell(r[i])).join(' | ')} |`),
	].join('\n');
}

export function htmlToMarkdown(html: unknown): string {
	const clean = sanitizeRichHtml(html);
	return clean
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<(strong|b)>(.*?)<\/\1>/gi, '**$2**')
		.replace(/<(em|i)>(.*?)<\/\1>/gi, '_$2_')
		.replace(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
		.replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n#### $1\n')
		.replace(/<li[^>]*>/gi, '\n- ')
		.replace(/<\/(p|div|ul|ol|blockquote|h\d)>/gi, '\n\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function richContent(c: Record<string, unknown>): string {
	const items = arr<{ type?: string; html?: string }>(c.content);
	if (items.length) {
		return items.map((i) => {
			const md = htmlToMarkdown(i.html);
			if (!md) return '';
			if (i.type === 'alert') return `> **Zákaz / Alert:** ${md}`;
			if (i.type === 'attention') return `> **Pozor / Attention:** ${md}`;
			return md;
		}).filter(Boolean).join('\n\n');
	}
	return str(c.markdown);
}

export function pagePath(page: Page, pages: Page[]): string {
	const parts: string[] = [];
	let cur: Page | undefined = page;
	for (let depth = 0; cur && !cur.isLanding && depth < 32; depth++) {
		parts.unshift(cur.slug);
		cur = pages.find((p) => p.id === cur!.parentId);
	}
	return `/${parts.join('/')}`;
}

function hexToCmyk(hex: string) {
	const h = hex.replace('#', '');
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
	const k = 1 - Math.max(r, g, b);
	if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 100 };
	const f = (v: number) => Math.round(((1 - v - k) / (1 - k)) * 100);
	return { c: f(r), m: f(g), y: f(b), k: Math.round(k * 100) };
}

function hexToRgb(hex: string) {
	const h = hex.replace('#', '');
	return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

export function colorsMarkdown(snap: ManualSnapshot, source = 'all'): string {
	const list = colorsForSource(snap.colors, snap.palettes, source);
	const groups = [null, ...snap.palettes].map((palette) => ({
		name: palette?.name ?? null,
		items: list.filter((c) => (palette ? c.paletteId === palette.id : !c.paletteId)),
	})).filter((g) => g.items.length);
	return groups.map((g) => {
		const rows = g.items.map((c) => {
			const refs = (c.productionRefs ?? []).map((r) => `${r.label || r.type}: ${r.value}`);
			if (!refs.length && c.pantoneRef) refs.push(`Pantone: ${c.pantoneRef}`);
			if (!refs.length && c.ralRef) refs.push(`RAL: ${c.ralRef}`);
			const k = c.cmyk ?? hexToCmyk(c.hex);
			const cmyk = `${k.c} ${k.m} ${k.y} ${k.k}`;
			return [c.name, c.hex.toUpperCase(), c.rgb ? `${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}` : hexToRgb(c.hex), cmyk, refs.join('; ')];
		});
		return `${g.name ? `**${g.name}**\n\n` : ''}${table(['Name', 'HEX', 'RGB', 'CMYK', 'Production'], rows)}`;
	}).join('\n\n');
}

export function typographyMarkdown(snap: ManualSnapshot, fontIds: string[] = []): string {
	const fonts = fontIds.length ? snap.fonts.filter((f) => fontIds.includes(f.id)) : snap.fonts;
	return fonts.map((f) => {
		const lines = [`**${f.name}**${f.role ? ` (${f.role})` : ''}`];
		if (f.foundry) lines.push(`- Foundry: ${f.foundry}`);
		if (f.weights?.length) lines.push(`- Weights: ${f.weights.join(', ')}`);
		if (f.isVariable) lines.push(`- Variable font${f.variableAxes?.length ? ` (${f.variableAxes.map((a) => `${a.tag} ${a.min}–${a.max}`).join(', ')})` : ''}`);
		if (f.license) lines.push(`- Licence: ${f.license}`);
		if (f.sourceUrl) lines.push(`- Source: ${f.sourceUrl}`);
		const styles = snap.styles.filter((s) => s.fontId === f.id);
		const t = table(['Style', 'Tag', 'Size px', 'Line height', 'Weight', 'Tracking em'],
			styles.map((s) => [s.name, s.tag ?? '', s.size ?? '', s.lineHeight ?? '', s.weight ?? '', s.tracking ?? '']));
		return [lines.join('\n'), t].filter(Boolean).join('\n\n');
	}).join('\n\n');
}

function abs(snap: ManualSnapshot, url: string): string {
	if (!url) return '';
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith('/')) return `${snap.origin}${url}`;
	return `${snap.origin}/uploads/${url.replace(/^\/+/, '')}`;
}

function assetList(snap: ManualSnapshot, c: Record<string, unknown>, imagesOnly = false): string {
	const folderId = str(c.folderId) || null;
	const tags = str(c.tags).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
	return snap.assets
		.filter((a) => (!imagesOnly || a.mime.startsWith('image/')) && (!folderId || a.folderId === folderId) && tags.every((t) => (a.tags ?? []).includes(t)))
		.slice(0, 100)
		.map((a) => `- [${a.filename}](${abs(snap, a.storagePath)})`)
		.join('\n');
}

export function blockMarkdown(block: Block, snap: ManualSnapshot): string {
	const c = (block.config ?? {}) as Record<string, unknown>;
	const out: string[] = [];
	if (str(c.heading)) out.push(`### ${str(c.heading)}`);
	const intro = Array.isArray(c.intro)
		? arr<{ html?: string }>(c.intro).map((i) => htmlToMarkdown(i.html)).filter(Boolean).join('\n\n')
		: str(c.intro);
	if (intro) out.push(intro);
	if (str(c.calloutText)) out.push(`> ${str(c.calloutText)}`);

	const body = getBlockDefinition(block.type)?.toMarkdown?.(c, {
		blockId: block.id,
		origin: snap.origin,
		str, arr, table, richContent,
		abs: (url) => abs(snap, url),
		colorsMarkdown: (source) => colorsMarkdown(snap, source),
		typographyMarkdown: (fontIds) => typographyMarkdown(snap, fontIds),
		colors: snap.colors,
		fonts: snap.fonts,
		assetList: (config, imagesOnly) => assetList(snap, config, imagesOnly),
	}) ?? '';
	if (body) out.push(body);
	return out.join('\n\n');
}

export function pageMarkdown(page: Page, snap: ManualSnapshot, headingLevel = 2): string {
	const blocks = snap.blocks.filter((b) => b.pageId === page.id).map((b) => blockMarkdown(b, snap)).filter(Boolean);
	return [
		`${'#'.repeat(headingLevel)} ${page.title}`,
		`URL: ${snap.origin}${pagePath(page, snap.pages)}`,
		str(page.description),
		...blocks,
	].filter(Boolean).join('\n\n');
}

export function manualMarkdown(snap: ManualSnapshot): string {
	const ordered: { page: Page; depth: number }[] = [];
	const walk = (parentId: string | null, depth: number) => {
		for (const p of snap.pages.filter((x) => x.parentId === parentId && !x.isLanding)) {
			ordered.push({ page: p, depth });
			if (depth < 8) walk(p.id, depth + 1);
		}
	};
	walk(null, 0);
	const landing = snap.pages.find((p) => p.isLanding);
	const toc = ordered.map(({ page, depth }) => `${'  '.repeat(depth)}- [${page.title}](${snap.origin}${pagePath(page, snap.pages)})`).join('\n');
	return [
		`# ${snap.brandName} — Brand manual`,
		`Source: ${snap.origin}/ · Exported ${new Date().toISOString().slice(0, 10)}`,
		'This file is a machine-readable export of the brand manual. Follow the rules below when creating content for this brand.',
		landing ? pageMarkdown(landing, snap, 2) : '',
		toc && `## Contents\n\n${toc}`,
		...ordered.map(({ page, depth }) => pageMarkdown(page, snap, Math.min(2 + depth, 4))),
	].filter(Boolean).join('\n\n') + '\n';
}

export function searchManual(snap: ManualSnapshot, query: string, limit = 10) {
	const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	const terms = norm(query).split(/\s+/).filter(Boolean);
	if (!terms.length) return [];
	return snap.pages
		.map((page) => {
			const text = norm(pageMarkdown(page, snap));
			const title = norm(page.title);
			const score = terms.reduce((sum, t) => sum + (title.includes(t) ? 5 : 0) + (text.split(t).length - 1), 0);
			return { page, score };
		})
		.filter((r) => r.score > 0 && terms.every((t) => norm(pageMarkdown(r.page, snap)).includes(t)))
		.sort((a, b) => b.score - a.score)
		.slice(0, limit);
}
