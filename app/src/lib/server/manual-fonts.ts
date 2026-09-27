/**
 * Brand fonts for the public manual: the heading and body typefaces picked in
 * Admin → Brand, resolved to @font-face rules (uploaded files) or an external
 * stylesheet (Google Fonts, Adobe…), plus the CSS font-family stacks.
 */
import { db } from '$lib/db';
import { typographyFonts, typographyFontFiles } from '$lib/db/schema';
import { inArray } from 'drizzle-orm';

type FontRow = typeof typographyFonts.$inferSelect;
type FileRow = typeof typographyFontFiles.$inferSelect;

export type ManualFonts = {
	/** @font-face rules for uploaded files; empty when nothing to declare */
	css: string;
	/** External stylesheets to link (fonts with a source URL) */
	stylesheets: string[];
	/** font-family stacks; null keeps the manual's default typeface */
	heading: string | null;
	body: string | null;
};

const EMPTY: ManualFonts = { css: '', stylesheets: [], heading: null, body: null };

const FORMAT: Record<string, string> = {
	woff2: 'woff2',
	woff: 'woff',
	ttf: 'truetype',
	otf: 'opentype',
	eot: 'embedded-opentype'
};

// Ordered so compound names win over their parts ("SemiBold" before "Bold")
const WEIGHT_NAMES: [RegExp, number][] = [
	[/(extra|ultra)[-_ ]?light/i, 200],
	[/(semi|demi)[-_ ]?bold/i, 600],
	[/(extra|ultra)[-_ ]?bold/i, 800],
	[/hairline|thin/i, 100],
	[/light/i, 300],
	[/medium/i, 500],
	[/bold/i, 700],
	[/black|heavy/i, 900],
	[/regular|book|normal|roman/i, 400]
];

function cssQuoted(value: string): string {
	// "<" is escaped too: the rules are inlined in a <style> element
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/</g, '\\3c ').replace(/[\r\n\f]/g, ' ');
}

function fileUrl(storagePath: string): string {
	return `/uploads/${storagePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
}

function stylesheetUrl(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url.href : null;
	} catch {
		return null;
	}
}

function staticWeight(file: FileRow, font: FontRow): number {
	const name = file.originalName.replace(/\.[a-z0-9]+$/i, '');
	for (const [re, weight] of WEIGHT_NAMES) if (re.test(name)) return weight;
	const declared = font.weights ?? [];
	return declared.length === 1 ? declared[0] : 400;
}

function fontFaces(font: FontRow, files: FileRow[]): string {
	const family = cssQuoted(font.name);
	return files
		.filter((f) => FORMAT[f.format])
		.map((f) => {
			const src = `url('${cssQuoted(fileUrl(f.storagePath))}') format('${FORMAT[f.format]}')`;
			const italic = /italic|oblique/i.test(f.originalName);
			const wght = (f.axes ?? []).find((a) => a.tag === 'wght');
			const weight = f.isVariable && wght ? `${Math.round(wght.min)} ${Math.round(wght.max)}` : String(staticWeight(f, font));
			return `@font-face { font-family: '${family}'; src: ${src}; font-weight: ${weight}; font-style: ${italic ? 'italic' : 'normal'}; font-display: swap; }`;
		})
		.join('\n');
}

function stack(font: FontRow): string {
	const fallback = font.role === 'mono' ? 'ui-monospace, monospace' : 'var(--font-sans)';
	return `'${cssQuoted(font.name)}', ${fallback}`;
}

export async function loadManualFonts(headingId: string | null | undefined, bodyId: string | null | undefined): Promise<ManualFonts> {
	const ids = [...new Set([headingId, bodyId].filter((id): id is string => Boolean(id)))];
	if (!ids.length) return EMPTY;

	const [fonts, files] = await Promise.all([
		db.select().from(typographyFonts).where(inArray(typographyFonts.id, ids)),
		db.select().from(typographyFontFiles).where(inArray(typographyFontFiles.fontId, ids))
	]);
	const byId = new Map(fonts.map((f) => [f.id, f]));

	const css: string[] = [];
	const stylesheets: string[] = [];
	for (const font of fonts) {
		// An external stylesheet is the font's canonical source; uploaded files otherwise
		const href = stylesheetUrl(font.sourceUrl);
		if (href) stylesheets.push(href);
		else css.push(fontFaces(font, files.filter((f) => f.fontId === font.id)));
	}

	const heading = headingId ? byId.get(headingId) : undefined;
	const body = bodyId ? byId.get(bodyId) : undefined;
	return {
		css: css.filter(Boolean).join('\n'),
		stylesheets,
		heading: heading ? stack(heading) : null,
		body: body ? stack(body) : null
	};
}
