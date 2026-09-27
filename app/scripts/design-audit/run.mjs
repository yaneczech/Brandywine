// Runs the DESIGN.md audit (core.js) over every public manual page in light and
// dark mode, on desktop and phone widths, and writes a grouped Markdown report.
// Usage: node scripts/design-audit/run.mjs [baseUrl] [outFile]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5174';
const out = process.argv[3] ?? 'design-audit.md';
const core = readFileSync(new URL('./core.js', import.meta.url), 'utf8');
const variants = [
	{ width: 1440, height: 900, scheme: 'light' },
	{ width: 1440, height: 900, scheme: 'dark' },
	{ width: 390, height: 844, scheme: 'light' }
];

let browser;
try {
	browser = await chromium.launch();
} catch (bundledError) {
	try {
		browser = await chromium.launch({ channel: 'chrome' });
	} catch (chromeError) {
		throw new AggregateError([bundledError, chromeError], 'Design audit could not launch bundled Chromium or system Chrome.');
	}
}
const discover = await browser.newPage();
await discover.goto(base + '/', { waitUntil: 'networkidle' });
const paths = await discover.evaluate(() =>
	[...new Set([...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0]))]
		.filter((h) => !/^\/(admin|api|access|llms)/.test(h)));
paths.push('/__design-audit-404');
await discover.close();

const results = [];
for (const v of variants) {
	const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, colorScheme: v.scheme });
	const page = await ctx.newPage();
	for (const path of paths) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		// Settle lazy content before measuring
		await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
		results.push(await page.evaluate(core));
	}
	await ctx.close();
}
await browser.close();

// Group identical findings across pages and variants
const groups = new Map();
for (const r of results) for (const f of r.findings) {
	const key = `${f.rule}|${f.where}|${f.detail}`;
	const g = groups.get(key) ?? { ...f, seen: new Set() };
	g.seen.add(`${r.url} @${r.width}${r.scheme === 'dark' ? ' dark' : ''}`);
	groups.set(key, g);
}
const byRule = new Map();
for (const g of groups.values()) (byRule.get(g.rule) ?? byRule.set(g.rule, []).get(g.rule)).push(g);

const lines = [`# Design audit — ${new Date().toISOString().slice(0, 10)}`, '', `Stránky: ${paths.join(', ')}`, `Varianty: ${variants.map((v) => `${v.width}px ${v.scheme}`).join(', ')}`, ''];
for (const [rule, items] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
	lines.push(`## ${rule} (${items.length})`, '');
	for (const g of items.slice(0, 60)) lines.push(`- \`${g.where}\` — ${g.detail}  _(${[...g.seen].slice(0, 3).join('; ')}${g.seen.size > 3 ? ` +${g.seen.size - 3}` : ''})_`);
	if (items.length > 60) lines.push(`- … a dalších ${items.length - 60}`);
	lines.push('');
}
writeFileSync(out, lines.join('\n'));
console.log([...byRule].map(([r, i]) => `${r}: ${i.length}`).join('\n'));
