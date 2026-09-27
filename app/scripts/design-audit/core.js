// Design audit — runs inside a rendered page and checks it against DESIGN.md.
// Usage: evaluate this file's source in the page; it returns { url, findings }.
// Findings are measured from computed styles and layout, not from source code,
// so they reflect what a reader actually sees.
(() => {
	const GRID = 4;
	const findings = [];
	const push = (rule, el, detail) => findings.push({ rule, where: describe(el), detail });

	// ── helpers ──────────────────────────────────────────────────────────────
	function describe(el) {
		const parts = [];
		for (let n = el, depth = 0; n && n.nodeType === 1 && depth < 3; n = n.parentElement, depth++) {
			const cls = [...n.classList].filter((c) => !c.startsWith('svelte-')).slice(0, 2).join('.');
			parts.unshift(n.tagName.toLowerCase() + (cls ? '.' + cls : ''));
			if (n.id || cls) { if (depth > 0) break; }
		}
		const block = el.closest('[data-block-type]')?.getAttribute('data-block-type');
		return (block ? `[${block}] ` : '') + parts.join(' > ');
	}
	const visible = (el) => {
		const r = el.getBoundingClientRect();
		if (r.width < 1 || r.height < 1) return false;
		const cs = getComputedStyle(el);
		return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
	};
	// Brand material is rendered with the brand's own styles on purpose (inline
	// style from block config, specimens, previews) — exempt it from UI rules.
	const BRAND_SEL = 'iframe,.ts-preview,.fs-hero,.fs-weights,.fs-glyphs,.fs-tester,.cc-preview,.swatch-tile,.color-swatch,.ratio-bar,.style-table td:first-child,.text-image-media,.hs-stage,.ld-stage,.logo-stage,.html-preview,.contrast-sample';
	// Real style declarations (not theme custom properties like --manual-brand)
	const hasBrandStyle = (n) => /(^|;)\s*(font|color|background)[\w-]*\s*:/.test(n.getAttribute('style') || '');
	const isBrandMaterial = (el) => {
		if (el.closest(BRAND_SEL)) return true;
		for (let n = el; n && n !== document.body; n = n.parentElement) {
			if (hasBrandStyle(n)) return true;
			if (n.hasAttribute('data-block-type')) break;
		}
		return false;
	};
	const parseColor = (c) => {
		const m = c.match(/rgba?\(([^)]+)\)/);
		if (!m) return null;
		const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
		return { r, g, b, a };
	};
	const lum = ({ r, g, b }) => {
		const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	};
	const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
	const blend = (top, bottom) => ({
		r: top.r * top.a + bottom.r * (1 - top.a),
		g: top.g * top.a + bottom.g * (1 - top.a),
		b: top.b * top.a + bottom.b * (1 - top.a), a: 1
	});
	function effectiveBg(el) {
		const layers = [];
		for (let n = el; n; n = n.parentElement) {
			const cs = getComputedStyle(n);
			if (cs.backgroundImage !== 'none' && n !== el) return null; // image/gradient: unknown
			const c = parseColor(cs.backgroundColor);
			if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
		}
		let bg = { r: 255, g: 255, b: 255, a: 1 };
		for (let i = layers.length - 1; i >= 0; i--) bg = blend(layers[i], bg);
		return bg;
	}
	const offGrid = (v) => v > 0.5 && Math.abs(v / GRID - Math.round(v / GRID)) * GRID > 1.01;

	const root = document.querySelector('main, #main, .page-main, .main') || document.body;
	const all = [...root.querySelectorAll('*')].filter(visible);

	// ── 1. Rhythm: vertical gaps between stacked siblings must sit on the grid
	for (const parent of all) {
		const cs = getComputedStyle(parent);
		if (!/block|flex|grid/.test(cs.display) || cs.flexDirection === 'row' && cs.display.includes('flex')) continue;
		if (parent.closest('svg')) continue; // SVG text is positioned, not flowed
		const kids = [...parent.children].filter(visible);
		for (let i = 1; i < kids.length; i++) {
			const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect();
			if (b.top < a.bottom - 1 || Math.abs(a.left - b.left) > 2 && a.right > b.left) continue; // not stacked
			const gap = Math.round((b.top - a.bottom) * 10) / 10;
			if (offGrid(gap) && !isBrandMaterial(kids[i]))
				push('gap-off-grid', kids[i], `${gap}px nad prvkem (mřížka 4 px)`);
		}
	}

	// ── 2. Duplicate rules: two horizontal hairlines closer than "near"
	const lines = [];
	for (const el of all) {
		const cs = getComputedStyle(el), r = el.getBoundingClientRect();
		for (const side of ['Top', 'Bottom']) {
			const w = parseFloat(cs[`border${side}Width`]);
			const col = parseColor(cs[`border${side}Color`]);
			if (w >= 1 && cs[`border${side}Style`] !== 'none' && col && col.a > 0.05)
				lines.push({ el, y: side === 'Top' ? r.top : r.bottom, x1: r.left, x2: r.right });
		}
	}
	lines.sort((p, q) => p.y - q.y);
	for (let i = 1; i < lines.length; i++) {
		const a = lines[i - 1], b = lines[i];
		// Parallel rules of similar length (dividers, section lines) — not the
		// outlines of neighbouring controls
		const dy = b.y - a.y, overlap = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
		const wa = a.x2 - a.x1, wb = b.x2 - b.x1;
		if (dy > 1.5 && dy < 12 && a.el !== b.el && Math.min(wa, wb) >= 120 && overlap >= 0.8 * Math.max(wa, wb))
			push('double-rule', b.el, `dvě linky ${Math.round(dy)}px od sebe (s ${describe(a.el)})`);
	}

	// ── 3. Empty boxes: chrome without content
	for (const el of all) {
		const r = el.getBoundingClientRect();
		if (r.width < 24 || r.height < 24 || el.children.length > 0 && el.textContent.trim()) continue;
		if (el.matches('img,svg,video,iframe,canvas,input,textarea,select,picture,button,a,hr,[role=img]') || el.querySelector('img,svg,video,iframe,canvas,input,picture')) continue;
		if (el.textContent.trim()) continue;
		const cs = getComputedStyle(el);
		const hasChrome = parseFloat(cs.borderTopWidth) > 0 || (parseColor(cs.backgroundColor)?.a ?? 0) > 0 || cs.backgroundImage !== 'none';
		if (hasChrome && !isBrandMaterial(el) && !el.closest('.color-swatch,.shades-strip,.palette-strip,.ratio-bar,.swatch-grid,.legend-bar-wrap,.pv-colors,.cc-swatches'))
			push('empty-box', el, `${Math.round(r.width)}×${Math.round(r.height)} bez obsahu`);
	}

	// ── 4. Triple chrome: border + fill + shadow on one element
	for (const el of all) {
		const cs = getComputedStyle(el);
		const border = parseFloat(cs.borderTopWidth) > 0 && (parseColor(cs.borderTopColor)?.a ?? 0) > 0;
		const fill = (parseColor(cs.backgroundColor)?.a ?? 0) > 0.5;
		// Visible outer shadow: not inset, not fully transparent, not zero-sized
		const shadow = cs.boxShadow.split(/,(?![^(]*\))/).some((sh) => !/inset/.test(sh) && !/rgba\([^)]*,\s*0\)/.test(sh) && !/^\s*(rgba?\([^)]*\)\s*)?0px 0px 0px/.test(sh) && sh.trim() !== 'none');
		const floating = /fixed|absolute/.test(cs.position) || el.closest('[role=dialog],[role=menu],[role=tooltip],.toast');
		if (border && fill && shadow && !floating) push('triple-chrome', el, 'rámeček + výplň + stín');
	}

	// ── 5. Text contrast (WCAG 1.4.3)
	const seen = new Set();
	for (const el of all) {
		const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
		if (!own || isBrandMaterial(el) || el.closest('[disabled],[aria-disabled=true],::placeholder')) continue;
		const cs = getComputedStyle(el);
		const fg = parseColor(cs.color), bg = effectiveBg(el);
		if (!fg || !bg) continue;
		const ratio = contrast(blend(fg, bg), bg);
		const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
		const need = size >= 24 || size >= 18.66 && bold ? 3 : 4.5;
		const key = describe(el) + ratio.toFixed(1);
		if (ratio < need && !seen.has(key)) { seen.add(key); push('contrast', el, `${ratio.toFixed(2)} : 1 (min ${need})`); }
	}

	// ── 6. Target size (WCAG 2.5.8) — inline links in running text are exempt
	for (const el of all) {
		if (!el.matches('a[href],button,[role=button],summary,input:not([type=hidden]),select')) continue;
		if (el.matches('[role=separator],.sidebar-resizer')) continue; // drag handles are sized by their hit area
		if (el.closest('p,li,.prose,.intro-text,figcaption') && el.matches('a')) continue;
		// A control wrapped in its label: the label is the target
		const label = el.matches('input,select') && el.closest('label');
		const r = (label || el).getBoundingClientRect();
		if (r.width < 24 || r.height < 24) push('target-size', el, `${Math.round(r.width)}×${Math.round(r.height)} px (min 24)`);
	}

	// ── 7. Line length: running text wider than ~90 characters
	for (const el of all) {
		if (!el.matches('p,li,blockquote,.intro-text,.block-text,.accordion-a,.card-desc,dd') || isBrandMaterial(el)) continue;
		const cs = getComputedStyle(el), r = el.getBoundingClientRect();
		const chars = r.width / (parseFloat(cs.fontSize) * 0.5);
		if (chars > 95 && el.textContent.trim().length > 120) push('measure', el, `≈${Math.round(chars)} znaků na řádek (max 90)`);
		const lh = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
		if (lh && lh < 1.35 && el.textContent.trim().length > 120) push('leading', el, `řádkování ${lh.toFixed(2)} (min 1,35)`);
	}

	// ── 8. Duplicate signal: arrow glyph in text next to an icon
	for (const el of all) {
		if (!el.matches('a,button')) continue;
		const txt = el.textContent;
		if (el.querySelector('svg') && /(->|→|↗|›|»|←|<-)/.test(txt)) push('duplicate-signal', el, `ikona + šipka v textu „${txt.trim().slice(0, 30)}“`);
		if (/->|<-/.test(txt)) push('typography', el, 'ASCII šipka místo znaku nebo ikony');
	}

	// ── 9. Pills: fully rounded controls (DESIGN.md: one radius, no pills)
	for (const el of all) {
		if (!el.matches('a,button,input,select,[role=tab],[role=button],.chip,.badge,.tag,.pill') ) continue;
		const cs = getComputedStyle(el), r = el.getBoundingClientRect();
		const rad = parseFloat(cs.borderTopLeftRadius);
		if (r.height >= 20 && rad >= r.height / 2 - 1 && r.width > r.height * 1.4) push('pill', el, `zaoblení ${Math.round(rad)}px na výšce ${Math.round(r.height)}px`);
	}

	// ── 10. Off-scale type and radii
	const vars = getComputedStyle(document.documentElement);
	const scale = new Set([...Array(12)].flatMap((_, i) => []).concat(
		['--text-2xs','--text-xs','--text-sm','--text-base','--text-md','--text-lg','--text-xl','--text-2xl','--text-3xl','--text-4xl','--text-5xl']
			.map((v) => Math.round(parseFloat(vars.getPropertyValue(v)) * 16 * 10) / 10)));
	const offType = new Map();
	for (const el of all) {
		const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
		if (!own || isBrandMaterial(el) || el.closest('svg') || el.closest('h1,h2,.stat-value,.cc-big,.card-index,.pv-type,.quote-block,.hero,.manual-hero,.fs-aa,.page-title')) continue;
		const fs = Math.round(parseFloat(getComputedStyle(el).fontSize) * 10) / 10;
		if (![...scale].some((s) => Math.abs(s - fs) < 0.6)) {
			const k = fs + '|' + describe(el);
			if (!offType.has(k)) offType.set(k, el);
		}
	}
	for (const [k, el] of offType) push('type-off-scale', el, `${k.split('|')[0]}px mimo stupnici --text-*`);

	// ── 11. Heading order and emphasis
	let last = 0;
	for (const h of root.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
		if (!visible(h)) continue;
		const lvl = +h.tagName[1];
		if (last && lvl > last + 1) push('heading-order', h, `h${last} → h${lvl}`);
		last = lvl;
	}

	// ── 12. Icon buttons need a name
	for (const el of all) {
		if (!el.matches('a,button,[role=button]')) continue;
		if (!el.textContent.trim() && !el.getAttribute('aria-label') && !el.getAttribute('title') && !el.getAttribute('aria-labelledby'))
			push('unnamed-control', el, 'ovládací prvek bez textu i aria-label');
	}

	return { url: location.pathname, width: innerWidth, scheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', findings };
})();
