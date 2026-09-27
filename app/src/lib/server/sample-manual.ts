/**
 * A small example manual for new installations, so the first visit shows
 * something real: an introduction, brand colours with a contrast checker,
 * the logo (when one was uploaded) and a voice & tone page. Everything is
 * ordinary content the admin can edit or delete.
 */
import { asc, eq, count } from 'drizzle-orm';
import { db } from '$db';
import { colorPalettes, colors, manualBlocks, manualPages } from '$db/schema';
import { createId } from '$lib/db/id';
import { hexToAllFormats } from '$lib/utils/colors';

type Lang = 'en' | 'cs';

const TEXT = {
	en: {
		intro: (brand: string) => `<p>This is the brand manual of <strong>${brand}</strong>: the rules, colours and files that keep everything we make recognisable.</p><p>It was created as an example. Edit any page in the admin, or delete it and start your own.</p>`,
		landingLead: 'Approved rules, assets and design principles.',
		colours: 'Colours', coloursLead: 'The brand palette and how to use it.',
		palette: 'Brand', primary: 'Primary', ink: 'Ink', paper: 'Paper',
		contrastHeading: 'Check a combination',
		logo: 'Logo', logoLead: 'The logo, its clear space and minimum size.',
		logoDescription: 'Keep clear space around the logo equal to the height of its lowercase letters. Never stretch, recolour or rotate it.',
		voice: 'Voice & tone', voiceLead: 'How we write.',
		voiceText: '<p>We write the way we talk to a colleague: clearly, briefly and kindly. One idea per sentence, active verbs, no jargon.</p>',
		dos: [
			{ type: 'do', text: 'Say what the reader gets first.' },
			{ type: 'dont', text: 'Hide the point at the end of a long paragraph.' },
			{ type: 'do', text: 'Use everyday words.' },
			{ type: 'dont', text: 'Use internal abbreviations readers do not know.' },
		],
	},
	cs: {
		intro: (brand: string) => `<p>Toto je brand manuál značky <strong>${brand}</strong>: pravidla, barvy a soubory, díky kterým je všechno, co tvoříme, rozpoznatelné.</p><p>Vznikl jako ukázka. Každou stránku můžete v administraci upravit, nebo ji smazat a začít po svém.</p>`,
		landingLead: 'Schválená pravidla, assety a designové principy.',
		colours: 'Barvy', coloursLead: 'Barevná paleta značky a jak ji používat.',
		palette: 'Značka', primary: 'Hlavní', ink: 'Inkoust', paper: 'Papír',
		contrastHeading: 'Vyzkoušejte kombinaci',
		logo: 'Logo', logoLead: 'Logo, jeho ochranná zóna a minimální velikost.',
		logoDescription: 'Kolem loga ponechte ochrannou zónu o výšce jeho malých písmen. Logo nedeformujte, nepřebarvujte ani neotáčejte.',
		voice: 'Tón komunikace', voiceLead: 'Jak píšeme.',
		voiceText: '<p>Píšeme tak, jak bychom mluvili s kolegou: jasně, stručně a vlídně. Jedna myšlenka na větu, činné sloveso, žádný žargon.</p>',
		dos: [
			{ type: 'do', text: 'Řekněte nejdřív, co čtenář získá.' },
			{ type: 'dont', text: 'Neschovávejte pointu na konec dlouhého odstavce.' },
			{ type: 'do', text: 'Používejte běžná slova.' },
			{ type: 'dont', text: 'Nepoužívejte interní zkratky, které čtenář nezná.' },
		],
	},
} as const;

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(s: string): string {
	return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function ensureLanding(): Promise<string> {
	const [landing] = await db.select({ id: manualPages.id }).from(manualPages).where(eq(manualPages.isLanding, true));
	if (landing) return landing.id;
	const [row] = await db.insert(manualPages).values({ title: 'Brand Manual', slug: '', isLanding: true, sortOrder: 0 }).returning({ id: manualPages.id });
	return row.id;
}

/** Brand colours for the example: the chosen primary, plus ink and paper — only if there are none yet */
async function ensureColours(lang: Lang, primary: string) {
	const [{ value }] = await db.select({ value: count() }).from(colors);
	if (value > 0) return;
	const t = TEXT[lang];
	const [palette] = await db.insert(colorPalettes).values({ name: t.palette, order: 0 }).returning({ id: colorPalettes.id });
	const swatches: [string, string][] = [[t.primary, primary], [t.ink, '#1a1a1a'], [t.paper, '#f7f5f0']];
	await db.insert(colors).values(swatches.map(([name, hex], order) => {
		const f = hexToAllFormats(hex);
		return { id: createId(), name, hex: hex.toLowerCase(), rgb: f.rgb, hsl: f.hsl, cmyk: f.cmyk, paletteId: palette.id, order };
	}));
}

export async function createSampleManual({ lang, brandName, primary, logoUrl }: {
	lang: Lang; brandName: string; primary: string; logoUrl: string | null;
}): Promise<void> {
	const t = TEXT[lang];
	const landingId = await ensureLanding();
	await ensureColours(lang, primary);

	await db.update(manualPages).set({ title: brandName, description: t.landingLead, updatedAt: new Date() }).where(eq(manualPages.id, landingId));

	const existing = await db.select({ sortOrder: manualBlocks.sortOrder }).from(manualBlocks)
		.where(eq(manualBlocks.pageId, landingId)).orderBy(asc(manualBlocks.sortOrder));
	if (!existing.length) {
		await db.insert(manualBlocks).values({
			pageId: landingId, type: 'rich_text', sortOrder: 10,
			config: { content: [{ type: 'text', html: t.intro(escapeHtml(brandName)) }] },
		});
	}

	const pages: { title: string; lead: string; blocks: { type: string; config: Record<string, unknown> }[] }[] = [];
	if (logoUrl) {
		pages.push({ title: t.logo, lead: t.logoLead, blocks: [
			{ type: 'logo_spec', config: { logoUrl, clearspace: 1, minSizePx: 32, minSizeMm: 10, description: t.logoDescription } },
		] });
	}
	pages.push({ title: t.colours, lead: t.coloursLead, blocks: [
		{ type: 'colors', config: { source: 'all' } },
		{ type: 'contrast_checker', config: { heading: t.contrastHeading, foreground: '#1a1a1a', background: '#f7f5f0' } },
	] });
	pages.push({ title: t.voice, lead: t.voiceLead, blocks: [
		{ type: 'rich_text', config: { content: [{ type: 'text', html: t.voiceText }] } },
		{ type: 'do_dont', config: { items: t.dos.map((d) => ({ ...d })) } },
	] });

	const taken = new Set((await db.select({ slug: manualPages.slug }).from(manualPages)).map((p) => p.slug));
	for (const [i, page] of pages.entries()) {
		let slug = slugify(page.title);
		while (taken.has(slug)) slug += '-1';
		taken.add(slug);
		const [row] = await db.insert(manualPages)
			.values({ title: page.title, slug, description: page.lead, sortOrder: (i + 1) * 10 })
			.returning({ id: manualPages.id });
		await db.insert(manualBlocks).values(page.blocks.map((b, j) => ({ pageId: row.id, type: b.type, config: b.config, sortOrder: (j + 1) * 10 })));
	}
}
