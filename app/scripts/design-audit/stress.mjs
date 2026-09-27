// Theme stress test: renders the public manual under extreme brand settings
// (injected CSS variables — no data is changed) and runs the audit on each.
// Usage: node scripts/design-audit/stress.mjs [baseUrl]
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:5174';
const core = readFileSync(new URL('./core.js', import.meta.url), 'utf8');
const shots = process.env.HOME + '/Brandywine-dev/shots/stress/';
mkdirSync(shots, { recursive: true });
const themes = {
	'radius-0': { '--manual-radius': '0px' },
	'radius-20': { '--manual-radius': '20px' },
	'brand-yellow': { '--manual-brand': '#F5D90A' },
	'brand-cyan-dark': { '--manual-brand': '#22D3EE', scheme: 'dark' },
	'brand-navy-dark': { '--manual-brand': '#16213E', scheme: 'dark' }
};
const paths = ['/', '/ukazka-bloku'];
const browser = await chromium.launch({ channel: 'chrome' });
for (const [name, t] of Object.entries(themes)) {
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: t.scheme ?? 'light' });
	const page = await ctx.newPage();
	const vars = Object.entries(t).filter(([k]) => k.startsWith('--')).map(([k, v]) => `${k}:${v} !important`).join(';');
	let total = 0; const rules = {};
	for (const path of paths) {
		await page.goto(base + path, { waitUntil: 'networkidle' });
		await page.addStyleTag({ content: `.manual-shell{${vars}}` });
		await page.waitForTimeout(200);
		const { findings } = await page.evaluate(core);
		for (const f of findings) { rules[f.rule] = (rules[f.rule] ?? 0) + 1; total++; }
		if (path === '/') await page.screenshot({ path: `${shots}${name}-home.png` });
		for (const [i, sel] of ['[data-block-type="colors"]', '[data-block-type="logo_download"]', '[data-block-type="rich_text"]'].entries()) {
			const el = page.locator(sel).first();
			if (path !== '/' && await el.count()) { await el.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${shots}${name}-${i}.png` }); }
		}
	}
	console.log(`${name}: ${total} findings`, JSON.stringify(rules));
	await ctx.close();
}
await browser.close();
