<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconCancel, IconExclamationCircle, IconChevronRight, IconDownload, IconCheck, IconCopy, IconX } from '@tabler/icons-svelte';
	import ManualBlockShell from './ManualBlockShell.svelte';

	type Block = {
		id: string; type: string;
		config: Record<string, unknown>;
		anchor: string | null;
		enabled: boolean;
	};
	type ManualLanguage = 'en' | 'cs';
	type RichContentItem = { type: 'text' | 'attention' | 'alert'; html: string };
	type ProductionRef = { type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other'; label: string; value: string };
	type ColorRow    = { id: string; name: string; hex: string; rgb: { r:number;g:number;b:number } | null; cmyk: { c:number;m:number;y:number;k:number } | null; hsl: { h:number;s:number;l:number } | null; pantoneRef: string | null; ralRef: string | null; productionRefs?: ProductionRef[] | null; paletteId: string | null; order: number };
	type PaletteRow  = { id: string; name: string; order: number };
	type FontRow     = { id: string; name: string; foundry: string | null; role: string | null; sourceUrl: string | null; weights: number[] | null; isVariable: boolean | null; order: number };
	type StyleRow    = { id: string; fontId: string | null; name: string; tag: string | null; size: number | null; lineHeight: number | null; tracking: number | null; weight: number | null; order: number };
	type FontFileRow = { id: string; fontId: string; storagePath: string; format: string; isVariable: boolean | null };

	const {
		block,
		language = 'en',
		colorRows    = [],
		paletteRows  = [],
		fontRows     = [],
		styleRows    = [],
		fontFileRows = [],
	}: {
		block: Block;
		language?: ManualLanguage;
		colorRows?: ColorRow[];
		paletteRows?: PaletteRow[];
		fontRows?: FontRow[];
		styleRows?: StyleRow[];
		fontFileRows?: FontFileRow[];
	} = $props();

	// ── Helpers ───────────────────────────────────────────────────────────────

	function slugify(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function assetSrc(path: unknown): string {
		const value = String(path ?? '');
		if (!value) return '';
		if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
		return `/uploads/${value.replace(/^\/+/, '')}`;
	}

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}

	function sanitizeHtml(value: unknown) {
		return String(value ?? '')
			.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
			.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
			.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
			.replace(/\s+href\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '')
			.replace(/<(?!\/?(p|br|strong|b|em|i|u|ul|ol|li|h3|h4|a)\b)[^>]+>/gi, '');
	}

	function markdownFallback(value: unknown) {
		const text = String(value ?? '').trim();
		if (!text) return '';
		return text.split(/\n{2,}/).map(part => `<p>${escapeHtml(part).replace(/\n/g, '<br>')}</p>`).join('');
	}

	function richContent(config: Record<string, unknown>): RichContentItem[] {
		if (Array.isArray(config.content)) {
			return config.content
				.map((item) => {
					const record = item as Record<string, unknown>;
					const type: RichContentItem['type'] =
						record.type === 'attention' || record.type === 'alert' ? record.type : 'text';
					return { type, html: sanitizeHtml(record.html) };
				})
				.filter((item) => item.html.trim());
		}
		const fallback = markdownFallback(config.markdown);
		return fallback ? [{ type: 'text', html: fallback }] : [];
	}

	function hexParts(hex: string) {
		return {
			r: parseInt(hex.slice(1,3),16),
			g: parseInt(hex.slice(3,5),16),
			b: parseInt(hex.slice(5,7),16),
		};
	}

	function hexToRgbStr(hex: string, color: ColorRow): string {
		if (color.rgb) return `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
		const { r,g,b } = hexParts(hex);
		return `${r}, ${g}, ${b}`;
	}

	// WCAG 2.1 relative luminance
	function relativeLuminance(hex: string): number {
		const { r,g,b } = hexParts(hex);
		const ch = [r,g,b].map(v => {
			const s = v / 255;
			return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
		});
		return 0.2126*ch[0] + 0.7152*ch[1] + 0.0722*ch[2];
	}

	function wcagContrast(hex1: string, hex2: string): number {
		const l1 = relativeLuminance(hex1);
		const l2 = relativeLuminance(hex2);
		const light = Math.max(l1, l2), dark = Math.min(l1, l2);
		return Math.round(((light + 0.05) / (dark + 0.05)) * 10) / 10;
	}

	function contrastOnColor(hex: string): string {
		return wcagContrast(hex, '#ffffff') >= wcagContrast(hex, '#000000') ? '#ffffff' : '#171717';
	}

	function wcagBadge(ratio: number): 'AAA' | 'AA' | 'A' | null {
		if (ratio >= 7)   return 'AAA';
		if (ratio >= 4.5) return 'AA';
		if (ratio >= 3)   return 'A';
		return null;
	}

	function computeHsl(hex: string): { h: number; s: number; l: number } {
		const { r, g, b } = hexParts(hex);
		const rp = r/255, gp = g/255, bp = b/255;
		const max = Math.max(rp,gp,bp), min = Math.min(rp,gp,bp);
		const l = (max+min)/2;
		if (max === min) return { h:0, s:0, l: Math.round(l*100) };
		const d = max-min;
		const s = l > 0.5 ? d/(2-max-min) : d/(max+min);
		let h = 0;
		if      (max===rp) h = (gp-bp)/d + (gp<bp ? 6 : 0);
		else if (max===gp) h = (bp-rp)/d + 2;
		else               h = (rp-gp)/d + 4;
		return { h: Math.round(h/6*360), s: Math.round(s*100), l: Math.round(l*100) };
	}

	function computeCmyk(hex: string): { c: number; m: number; y: number; k: number } {
		const { r, g, b } = hexParts(hex);
		const rp = r/255, gp = g/255, bp = b/255;
		const k = 1 - Math.max(rp,gp,bp);
		if (k >= 0.999) return { c:0, m:0, y:0, k:100 };
		const inv = 1-k;
		return {
			c: Math.round((1-rp-k)/inv*100),
			m: Math.round((1-gp-k)/inv*100),
			y: Math.round((1-bp-k)/inv*100),
			k: Math.round(k*100),
		};
	}

	function fmtHsl(hsl: { h:number; s:number; l:number }): string {
		return `${hsl.h}° ${hsl.s}% ${hsl.l}%`;
	}

	function fmtCmyk(c: { c:number;m:number;y:number;k:number }): string {
		return `C${c.c} M${c.m} Y${c.y} K${c.k}`;
	}

	// Mix two hex colors (ratio: 0 = original, 1 = target)
	function mixHex(hex: string, target: string, ratio: number): string {
		const { r: r1, g: g1, b: b1 } = hexParts(hex);
		const { r: r2, g: g2, b: b2 } = hexParts(target);
		const r = Math.round(r1 + (r2 - r1) * ratio).toString(16).padStart(2, '0');
		const g = Math.round(g1 + (g2 - g1) * ratio).toString(16).padStart(2, '0');
		const b = Math.round(b1 + (b2 - b1) * ratio).toString(16).padStart(2, '0');
		return `#${r}${g}${b}`;
	}

	// Generate 9 tints/shades (100–900) from a base hex
	function generateShades(hex: string): Array<{ label: string; hex: string }> {
		return [
			{ label: '100', hex: mixHex(hex, '#ffffff', 0.88) },
			{ label: '200', hex: mixHex(hex, '#ffffff', 0.72) },
			{ label: '300', hex: mixHex(hex, '#ffffff', 0.54) },
			{ label: '400', hex: mixHex(hex, '#ffffff', 0.32) },
			{ label: '500', hex },
			{ label: '600', hex: mixHex(hex, '#000000', 0.18) },
			{ label: '700', hex: mixHex(hex, '#000000', 0.36) },
			{ label: '800', hex: mixHex(hex, '#000000', 0.54) },
			{ label: '900', hex: mixHex(hex, '#000000', 0.70) },
		];
	}

	function productionRefsFor(color: ColorRow): ProductionRef[] {
		if (Array.isArray(color.productionRefs) && color.productionRefs.length) {
			return color.productionRefs
				.map((ref) => ({
					type: ref.type ?? 'other',
					label: ref.label || productionLabel(ref.type ?? 'other'),
					value: ref.value ?? ''
				}))
				.filter((ref) => ref.value);
		}
		const refs: ProductionRef[] = [];
		if (color.pantoneRef) refs.push({ type: 'pantone', label: 'Pantone', value: color.pantoneRef });
		if (color.ralRef) refs.push({ type: 'ral', label: 'RAL', value: color.ralRef });
		return refs;
	}

	function productionLabel(type: ProductionRef['type']) {
		if (type === 'pantone') return 'Pantone';
		if (type === 'ral') return 'RAL';
		if (type === 'ncs') return 'NCS';
		if (type === 'foil') return 'Signmaking fólie';
		return 'Reference';
	}

	// Copy-to-clipboard
	let copiedKey = $state('');
	async function copyValue(key: string, value: string) {
		copiedKey = key;
		setTimeout(() => { if (copiedKey === key) copiedKey = ''; }, 1400);
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			try {
				const textarea = document.createElement('textarea');
				textarea.value = value;
				textarea.setAttribute('readonly', '');
				textarea.style.position = 'fixed';
				textarea.style.left = '-9999px';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				textarea.remove();
			} catch {
				// Keep the visual confirmation even when the browser blocks clipboard writes.
			}
		}
	}

	// ── Derived data ──────────────────────────────────────────────────────────

	// Colors filtered by source config
	const filteredColors = $derived.by(() => {
		const source = String(block.config.source ?? 'all');
		if (source === 'all') return colorRows;
		const palette = paletteRows.find(p => p.name.toLowerCase() === source);
		if (palette) return colorRows.filter(c => c.paletteId === palette.id);
		return colorRows;
	});

	// Colors grouped by palette
	const colorsByPalette = $derived.by(() => {
		const groups: { palette: PaletteRow | null; colors: ColorRow[] }[] = [];
		const noPalette = filteredColors.filter(c => !c.paletteId);
		if (noPalette.length) groups.push({ palette: null, colors: noPalette });
		for (const palette of paletteRows) {
			const cols = filteredColors.filter(c => c.paletteId === palette.id);
			if (cols.length) groups.push({ palette, colors: cols });
		}
		return groups;
	});

	// Typography — font faces injected once
	const fontFaces = $derived.by(() => {
		return fontRows.map(font => {
			const files = fontFileRows.filter(f => f.fontId === font.id);
			if (!files.length) return '';
			if (font.sourceUrl) return ''; // external URL — injected via <link>
			const srcs = files.map(f =>
				`url('/uploads/${f.storagePath}') format('${f.format}')`
			).join(', ');
			const weights = (font.weights ?? [400]);
			return weights.map(w => `@font-face { font-family: '${font.name}'; src: ${srcs}; font-weight: ${w}; font-display: swap; }`).join('\n');
		}).join('\n');
	});

	const anchorId = $derived(block.anchor ?? (block.config.heading ? slugify(String(block.config.heading)) : undefined));

	// before/after slider state
	let sliderValue = $state(50);
	// typo_rules tab state
	let typoRulesTab = $state(0);
</script>

{#if !block.enabled}
	<!-- hidden -->

{:else if block.type === 'divider'}
	<hr class="divider" id={anchorId} style="margin: {block.config.spacing ?? 4}rem 0" />

{:else if block.type === 'rich_text'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if richContent(block.config).length}
			<div class="rich-flow">
				{#each richContent(block.config) as item}
					{#if item.type === 'text'}
						<div class="prose">{@html item.html}</div>
					{:else}
						<div class="content-callout" class:alert={item.type === 'alert'}>
							<div class="content-callout-icon" aria-hidden="true">
								{#if item.type === 'alert'}<IconCancel size={18} stroke={1.9} />{:else}<IconExclamationCircle size={18} stroke={1.9} />{/if}
							</div>
							<div class="content-callout-body">{@html item.html}</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'image'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.url}
			<figure class="img-figure" class:full-width={block.config.fullWidth}>
				<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" />
				{#if block.config.caption}
					<figcaption class="img-caption">{block.config.caption}</figcaption>
				{/if}
			</figure>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'before_after'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.beforeUrl && block.config.afterUrl}
			<div class="ba-wrap">
				<div class="ba-slider" style="--split:{sliderValue}%">
					<div class="ba-before">
						<img src={assetSrc(block.config.beforeUrl)} alt={String(block.config.beforeLabel ?? 'Before')} />
						{#if block.config.beforeLabel}<span class="ba-label ba-label-before">{block.config.beforeLabel}</span>{/if}
					</div>
					<div class="ba-after">
						<img src={assetSrc(block.config.afterUrl)} alt={String(block.config.afterLabel ?? 'After')} />
						{#if block.config.afterLabel}<span class="ba-label ba-label-after">{block.config.afterLabel}</span>{/if}
					</div>
					<div class="ba-divider" style="left:{sliderValue}%">
						<div class="ba-handle"></div>
					</div>
				</div>
				<input type="range" min="0" max="100" bind:value={sliderValue} class="ba-range" aria-label="Porovnání" />
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'colors'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if filteredColors.length}
			<div class="colors-wrap">
				{#each colorsByPalette as group, gi}
					<section class="palette-section" aria-labelledby="palette-{gi}">
						<div class="palette-head">
							<div class="palette-title-wrap">
								{#if block.config.showPaletteNames !== false}
									<h3 id="palette-{gi}" class="palette-name">
										{group.palette?.name ?? 'Barvy'}
									</h3>
								{/if}
								<span class="palette-count">{group.colors.length} {group.colors.length === 1 ? 'barva' : group.colors.length < 5 ? 'barvy' : 'barev'}</span>
							</div>
							<div class="palette-strip" aria-hidden="true">
								{#each group.colors as stripColor}
									<span class="palette-strip-swatch" style="background:{stripColor.hex}"></span>
								{/each}
							</div>
						</div>

						<div class="color-grid">
						{#each group.colors as color}
							{@const hex = color.hex.toUpperCase()}
							{@const onColor = contrastOnColor(color.hex)}
							{@const rgbStr = hexToRgbStr(color.hex, color)}
							{@const hslStr = fmtHsl(color.hsl ?? computeHsl(color.hex))}
							{@const cmykStr = fmtCmyk(color.cmyk ?? computeCmyk(color.hex))}
							{@const crWhite = wcagContrast(color.hex, '#ffffff')}
							{@const crBlack = wcagContrast(color.hex, '#000000')}
							{@const badgeWhite = wcagBadge(crWhite)}
							{@const badgeBlack = wcagBadge(crBlack)}
							{@const productionRefs = productionRefsFor(color)}
							<div class="color-card">
								<button
									class="color-swatch"
									style="background:{color.hex}; color:{onColor}"
									onclick={() => copyValue(`hex-${color.id}`, hex)}
									title="Kopírovat {hex}"
									aria-label="Kopírovat {hex}"
								>
									<span class="swatch-copy-icon" aria-hidden="true">
										{#if copiedKey === `hex-${color.id}`}
											<IconCheck size={15} stroke={2.4} />
										{:else}
											<IconCopy size={15} stroke={1.9} />
										{/if}
									</span>
									<div class="swatch-bottom">
										<span class="swatch-hex-val">{hex}</span>
										{#if copiedKey === `hex-${color.id}`}
											<span class="copied-flash">Zkopírováno</span>
										{:else}
											<span class="copy-hint">Kopírovat HEX</span>
										{/if}
									</div>
								</button>

								<div class="color-details">
									<div class="color-title-row">
										<strong class="color-name">{color.name}</strong>
									</div>

									{#if block.config.showCodes !== false}
										<div class="color-values">
											<button class="cv-row" onclick={() => copyValue(`h-${color.id}`, hex)} title="Kopírovat HEX">
												<span class="cv-label">HEX</span>
												<span class="cv-val mono">{hex}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `h-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`r-${color.id}`, rgbStr)} title="Kopírovat RGB">
												<span class="cv-label">RGB</span>
												<span class="cv-val mono">{rgbStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `r-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`hsl-${color.id}`, hslStr)} title="Kopírovat HSL">
												<span class="cv-label">HSL</span>
												<span class="cv-val mono">{hslStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `hsl-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`c-${color.id}`, cmykStr)} title="Kopírovat CMYK">
												<span class="cv-label">CMYK</span>
												<span class="cv-val mono">{cmykStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `c-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											{#if color.ralRef}
												<button class="cv-row" onclick={() => copyValue(`rl-${color.id}`, color.ralRef!)} title="Kopírovat RAL">
													<span class="cv-label">RAL</span>
													<span class="cv-val">{color.ralRef}</span>
													<span class="cv-copy" aria-hidden="true">
														{#if copiedKey === `rl-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
													</span>
												</button>
											{/if}
										</div>

										{#if productionRefs.length}
											<div class="production-detail">
												<div class="production-label">Production</div>
												<div class="production-list">
													{#each productionRefs as ref, refIndex}
														<button
															class="production-row"
															onclick={() => copyValue(`prod-${color.id}-${refIndex}`, ref.value)}
															title="Kopírovat {ref.label}"
														>
															<span class="production-ref-label">{ref.label}</span>
															<span class="production-ref-value">{ref.value}</span>
															<span class="cv-copy" aria-hidden="true">
																{#if copiedKey === `prod-${color.id}-${refIndex}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
															</span>
														</button>
													{/each}
												</div>
											</div>
										{/if}

										{#if block.config.showContrast !== false}
											<div class="contrast-detail">
												<div class="contrast-pair" class:pass={crWhite >= 4.5} class:warn={crWhite >= 3 && crWhite < 4.5} class:fail={crWhite < 3}>
													<span class="contrast-sample contrast-sample-white" style="color:{color.hex}">A</span>
													<span class="contrast-meta">
														<span class="contrast-bg">na bílé</span>
														<strong>{crWhite}:1</strong>
														{#if badgeWhite}<em>{badgeWhite}</em>{/if}
													</span>
												</div>
												<div class="contrast-pair" class:pass={crBlack >= 4.5} class:warn={crBlack >= 3 && crBlack < 4.5} class:fail={crBlack < 3}>
													<span class="contrast-sample contrast-sample-black" style="color:{color.hex}">A</span>
													<span class="contrast-meta">
														<span class="contrast-bg">na černé</span>
														<strong>{crBlack}:1</strong>
														{#if badgeBlack}<em>{badgeBlack}</em>{/if}
													</span>
												</div>
											</div>
										{/if}
									{/if}
								</div>

								{#if block.config.showShades}
									{@const shades = generateShades(color.hex)}
									<div class="shades-strip">
										{#each shades as shade}
											<button
												class="shade-btn"
												style="background:{shade.hex}"
												data-label={shade.label}
												onclick={() => copyValue(`s-${color.id}-${shade.label}`, shade.hex.toUpperCase())}
												title="{shade.label}: {shade.hex.toUpperCase()}"
												aria-label="Kopírovat {shade.label}: {shade.hex.toUpperCase()}"
											>
												{#if copiedKey === `s-${color.id}-${shade.label}`}
													<span class="shade-flash">✓</span>
												{/if}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
						</div>
					</section>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">Žádné barvy zatím nebyly přidány.</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'typography'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if fontFaces}{@html `<style>${fontFaces}</style>`}{/if}
		{#if fontRows.length}
			<div class="typo-fonts">
				{#each fontRows as font}
					{@const styles = styleRows.filter(s => s.fontId === font.id).sort((a,b) => a.order - b.order)}
					{#if font.sourceUrl}{@html `<link rel="stylesheet" href="${font.sourceUrl}">`}{/if}
					<div class="typo-font">
						<div class="typo-specimen" style="font-family:'{font.name}', sans-serif">
							<div class="specimen-alpha">Aa Bb Cc</div>
							<div class="specimen-sentence">The quick brown fox jumps over the lazy dog</div>
						</div>
						<div class="typo-info">
							<strong class="font-name">{font.name}</strong>
							{#if font.foundry}<span class="font-meta">{font.foundry}</span>{/if}
							{#if font.role}<span class="font-role">{font.role}</span>{/if}
						</div>
						{#if block.config.showStyles !== false && styles.length}
							<div class="style-table-wrap">
								<table class="style-table">
									<thead><tr>
										<th>Styl</th><th>Velikost</th><th>Řádkování</th><th>Váha</th><th>Tracking</th>
									</tr></thead>
									<tbody>
										{#each styles as style}
											<tr>
												<td style="font-family:'{font.name}',sans-serif;font-size:{Math.min(style.size ?? 16, 28)}px;font-weight:{style.weight ?? 400};line-height:{style.lineHeight ?? 1.5};letter-spacing:{style.tracking ?? 0}em">{style.name}</td>
												<td>{style.size ?? '—'}px</td>
												<td>{style.lineHeight ?? '—'}</td>
												<td>{style.weight ?? '—'}</td>
												<td>{style.tracking != null ? `${style.tracking}em` : '—'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">Žádné fonty zatím nebyly přidány.</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'logo_spec'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.logoUrl}
			<div class="logo-spec">
				<div class="logo-preview-wrap">
					<div class="logo-clearspace" style="padding: calc({block.config.clearspace ?? 1} * 3rem)">
						<img src={assetSrc(block.config.logoUrl)} alt="Logo" class="logo-preview-img" />
					</div>
					<div class="logo-clearspace logo-clearspace-dark" style="padding: calc({block.config.clearspace ?? 1} * 3rem)">
						<img src={assetSrc(block.config.logoUrl)} alt="Logo" class="logo-preview-img" />
					</div>
				</div>
				<dl class="logo-specs">
					{#if block.config.clearspace != null}
						<div><dt>Ochranná zóna</dt><dd>{block.config.clearspace}× výška X</dd></div>
					{/if}
					{#if block.config.minSizePx != null}
						<div><dt>Min. velikost</dt><dd>{block.config.minSizePx}px / {block.config.minSizeMm ?? '—'}mm</dd></div>
					{/if}
				</dl>
				{#if block.config.description}
					<p class="block-text">{block.config.description}</p>
				{/if}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'naming'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.markdown}
			<div class="prose">{@html markdownFallback(block.config.markdown)}</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'text_styles'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if fontFaces}{@html `<style>${fontFaces}</style>`}{/if}
		{#if styleRows.length}
			<div class="text-styles">
				{#each styleRows as style}
					{@const font = fontRows.find(f => f.id === style.fontId)}
					{#if font?.sourceUrl}{@html `<link rel="stylesheet" href="${font.sourceUrl}">`}{/if}
					<div class="ts-row">
						<div class="ts-preview" style="
							font-family:'{font?.name ?? 'inherit'}', sans-serif;
							font-size:{Math.min(style.size ?? 16, 56)}px;
							font-weight:{style.weight ?? 400};
							line-height:{style.lineHeight ?? 1.5};
							letter-spacing:{style.tracking ?? 0}em;
						">{style.name}</div>
						<div class="ts-meta">
							<span>{style.size ?? '—'}px</span>
							<span>/{style.lineHeight ?? '—'}</span>
							<span>W{style.weight ?? '—'}</span>
							{#if font}<span class="ts-font">{font.name}</span>{/if}
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">Žádné typografické styly zatím nejsou definovány.</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'grid'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="grid-spec">
			<div class="grid-visual" style="
				--cols: {block.config.columns ?? 12};
				--gutter: {block.config.gutter ?? 24}px;
				--margin: {block.config.margin ?? 40}px;
			">
				{#each Array(Number(block.config.columns ?? 12)) as _}
					<div class="grid-col"></div>
				{/each}
			</div>
			<dl class="grid-meta">
				<div><dt>Sloupce</dt><dd>{block.config.columns ?? 12}</dd></div>
				<div><dt>Gutter</dt><dd>{block.config.gutter ?? 24}px</dd></div>
				<div><dt>Margin</dt><dd>{block.config.margin ?? 40}px</dd></div>
				<div><dt>Max šířka</dt><dd>{block.config.maxWidth ?? 1280}px</dd></div>
				{#if block.config.medium}<div><dt>Médium</dt><dd>{block.config.medium}</dd></div>{/if}
			</dl>
			{#if block.config.description}
				<p class="block-text">{block.config.description}</p>
			{/if}
		</div>
	</ManualBlockShell>

{:else if block.type === 'do_dont'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.items)}
			<div class="do-dont-grid">
				{#each block.config.items as item}
					<div class="do-dont-item" class:is-do={item.type === 'do'} class:is-dont={item.type === 'dont'}>
						<span class="do-dont-badge">
							{#if item.type === 'do'}<IconCheck size={12} stroke={2.5} />Do{:else}<IconX size={12} stroke={2.5} />Don't{/if}
						</span>
						<p>{item.text}</p>
					</div>
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'process'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.steps)}
			<ol class="process-list">
				{#each block.config.steps as step, i}
					<li class="process-step">
						<div class="step-num">{i + 1}</div>
						<div>
							<div class="step-title">{step.title}</div>
							{#if step.description}<p class="step-desc">{step.description}</p>{/if}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'cards'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.cards) && block.config.cards.length}
			<div class="cards-grid">
				{#each block.config.cards as card}
					<div class="info-card">
						{#if card.imageUrl}
							<div class="card-img-wrap">
								<img src={assetSrc(card.imageUrl)} alt={card.title} />
							</div>
						{/if}
						<div class="card-body">
							{#if card.title}<strong class="card-title">{card.title}</strong>{/if}
							{#if card.description}<p class="card-desc">{card.description}</p>{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'chart'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.data}
			{@const lines = String(block.config.data).trim().split('\n').filter(Boolean)}
			{@const entries = lines.map(l => { const [label, val] = l.split(':'); return { label: label?.trim() ?? '', value: Math.min(100, Math.max(0, Number(val?.trim() ?? 0))) }; })}
			{@const count = entries.length}
			{@const cx = 160}
			{@const cy = 160}
			{@const r  = 120}
			<div class="chart-wrap">
				<svg class="radar-chart" viewBox="0 0 320 320" aria-label={String(block.config.datasetLabel ?? 'Brand chart')}>
					<!-- grid rings -->
					{#each [0.25,0.5,0.75,1] as ring}
						<polygon class="radar-grid"
							points={Array.from({length:count},(_,i)=>{
								const angle = (i/count)*Math.PI*2 - Math.PI/2;
								return `${cx+Math.cos(angle)*r*ring},${cy+Math.sin(angle)*r*ring}`;
							}).join(' ')}
						/>
					{/each}
					<!-- axes -->
					{#each entries as _,i}
						{@const angle = (i/count)*Math.PI*2 - Math.PI/2}
						<line class="radar-axis" x1={cx} y1={cy} x2={cx+Math.cos(angle)*r} y2={cy+Math.sin(angle)*r} />
					{/each}
					<!-- data polygon -->
					<polygon class="radar-data"
						points={entries.map(({value},i)=>{
							const angle=(i/count)*Math.PI*2-Math.PI/2;
							return `${cx+Math.cos(angle)*r*(value/100)},${cy+Math.sin(angle)*r*(value/100)}`;
						}).join(' ')}
					/>
					<!-- labels -->
					{#each entries as {label,value},i}
						{@const angle=(i/count)*Math.PI*2-Math.PI/2}
						{@const lx=cx+Math.cos(angle)*(r+22)}
						{@const ly=cy+Math.sin(angle)*(r+22)}
						<text class="radar-label" x={lx} y={ly}
							text-anchor={lx<cx-8?'end':lx>cx+8?'start':'middle'}
							dominant-baseline={ly<cy-8?'auto':ly>cy+8?'hanging':'middle'}
						>{label}</text>
					{/each}
				</svg>
				<div class="chart-legend">
					{#each entries as {label,value}}
						<div class="legend-row">
							<span class="legend-label">{label}</span>
							<div class="legend-bar-wrap"><div class="legend-bar" style="width:{value}%"></div></div>
							<span class="legend-value">{value}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'accordion'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.items)}
			<div class="accordion">
				{#each block.config.items as item}
					<details class="accordion-item">
						<summary class="accordion-q">
							{item.question}
							<IconChevronRight size={16} stroke={2} class="accordion-icon" />
						</summary>
						<div class="accordion-a">{item.answer}</div>
					</details>
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'table'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.headers)}
			<div class="table-wrap">
				<table class="block-table">
					<thead><tr>{#each block.config.headers as h}<th>{h}</th>{/each}</tr></thead>
					<tbody>
						{#if Array.isArray(block.config.rows)}
							{#each block.config.rows as row}
								<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'html'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.html}
			{#if block.config.showPreview !== false}
				<div class="html-preview">{@html block.config.html}</div>
			{/if}
			<pre class="code-block"><code>{block.config.html}</code></pre>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'code'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<pre class="code-block"><code>{block.config.code ?? ''}</code></pre>
	</ManualBlockShell>

{:else if block.type === 'typo_rules'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.languages) && block.config.languages.length}
			{@const langs = block.config.languages as Array<{ lang: string; label: string; rules: Array<{ category: string; rule: string; correct?: string; wrong?: string }> }>}
			<!-- language tabs -->
			{#if langs.length > 1}
				<div class="tr-tabs" role="tablist">
					{#each langs as tl, i}
						<button
							type="button"
							class="tr-tab"
							class:active={typoRulesTab === i}
							onclick={() => (typoRulesTab = i)}
							role="tab"
							aria-selected={typoRulesTab === i}
						>{tl.label || tl.lang}</button>
					{/each}
				</div>
			{/if}
			{@const activeLang = langs[typoRulesTab] ?? langs[0]}
			{#if activeLang?.rules?.length}
				<div class="tr-table-wrap">
					<table class="tr-table">
						<thead><tr>
							<th style="width:140px">Kategorie</th>
							<th>Pravidlo</th>
							<th style="width:160px">✓ Správně</th>
							<th style="width:160px">✗ Špatně</th>
						</tr></thead>
						<tbody>
							{#each activeLang.rules as rule}
								<tr>
									<td class="tr-cat">{rule.category}</td>
									<td>{rule.rule}</td>
									<td class="tr-correct">{rule.correct ?? ''}</td>
									<td class="tr-wrong">{rule.wrong ?? ''}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="muted-block"><span class="placeholder-copy">Žádná pravidla zatím nejsou definována.</span></div>
			{/if}
		{:else}
			<div class="muted-block"><span class="placeholder-copy">Přidejte jazyky a typografická pravidla v editoru.</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'image_gallery' || block.type === 'carousel'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block"><span class="placeholder-copy">Galerie — připojte složku z assetů.</span></div>
	</ManualBlockShell>

{:else if block.type === 'icons'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block"><span class="placeholder-copy">Ikony — připojte složku z assetů.</span></div>
	</ManualBlockShell>

{:else if block.type === 'asset_gallery'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block"><span class="placeholder-copy">Asset galerie — připojte složku z assetů.</span></div>
	</ManualBlockShell>

{:else if block.type === 'download'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block"><span class="placeholder-copy">Ke stažení — připojte složku nebo tagy z assetů.</span></div>
	</ManualBlockShell>

{:else}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block">
			<span class="block-type-label">{block.type}</span>
		</div>
	</ManualBlockShell>
{/if}

<style>
	/* ── Shared ──────────────────────────────────────────────────────────────── */
	.block-text { color: var(--manual-muted); line-height: 1.72; font-size: .93rem; }

	hr.divider { border: none; border-top: 1px solid var(--manual-border); }

	.muted-block {
		display: flex; flex-direction: column; gap: 6px;
		padding: 1.35rem;
		border: 1px dashed color-mix(in srgb, var(--manual-ink) 16%, transparent);
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-surface) 62%, transparent);
		color: var(--manual-muted);
	}
	.placeholder-copy { font-size: .88rem; line-height: 1.55; }
	.block-type-label {
		display: block; margin-bottom: .4rem; color: var(--manual-brand);
		font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; font-weight: 780;
	}

	/* ── Rich text ───────────────────────────────────────────────────────────── */
	.prose { max-width: 760px; color: var(--manual-ink); line-height: 1.8; font-size: 1rem; }
	.prose :global(p) { margin: 0 0 .9rem; }
	.prose :global(p:last-child), .prose :global(ul:last-child), .prose :global(ol:last-child) { margin-bottom: 0; }
	.prose :global(ul), .prose :global(ol) { margin: .4rem 0 .9rem 1.25rem; padding: 0; }
	.rich-flow { display: flex; flex-direction: column; gap: 1rem; }
	.content-callout {
		display: grid; grid-template-columns: 24px minmax(0,1fr); gap: .75rem;
		padding: .95rem 1rem;
		border: 1px solid color-mix(in srgb, var(--manual-info, #2563eb) 28%, var(--manual-border));
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-info, #2563eb) 8%, var(--manual-surface));
		color: var(--manual-ink);
	}
	.content-callout.alert {
		border-color: color-mix(in srgb, #ef4444 34%, var(--manual-border));
		background: color-mix(in srgb, #ef4444 9%, var(--manual-surface));
	}
	.content-callout-icon { width: 24px; height: 24px; display: grid; place-items: center; color: var(--manual-info, #2563eb); }
	.content-callout.alert .content-callout-icon { color: #dc2626; }
	.content-callout-body { font-size: .92rem; line-height: 1.65; }
	.content-callout-body :global(p) { margin: 0 0 .65rem; }
	.content-callout-body :global(p:last-child) { margin-bottom: 0; }

	/* ── Image ───────────────────────────────────────────────────────────────── */
	.img-figure { margin: 0; }
	.img-figure.full-width { width: 100%; }
	.block-img {
		display: block; max-width: 100%;
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-surface) 86%, var(--manual-ink));
	}
	.img-caption { margin-top: .7rem; color: var(--manual-muted); font-size: .84rem; line-height: 1.5; }

	/* ── Before / After ──────────────────────────────────────────────────────── */
	.ba-wrap { display: flex; flex-direction: column; gap: .5rem; }
	.ba-slider {
		position: relative; overflow: hidden; border-radius: var(--manual-radius);
		aspect-ratio: 16/9; user-select: none;
		border: 1px solid var(--manual-border);
	}
	.ba-before, .ba-after {
		position: absolute; inset: 0;
	}
	.ba-before { clip-path: inset(0 calc(100% - var(--split)) 0 0); }
	.ba-after  { clip-path: inset(0 0 0 var(--split)); }
	.ba-before img, .ba-after img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.ba-divider {
		position: absolute; top: 0; bottom: 0; width: 2px;
		background: #fff; transform: translateX(-50%); pointer-events: none;
	}
	.ba-handle {
		position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
		width: 36px; height: 36px; border-radius: 50%;
		background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3);
		display: flex; align-items: center; justify-content: center;
	}
	.ba-label {
		position: absolute; bottom: 10px; padding: 4px 10px; border-radius: 4px;
		background: rgba(0,0,0,.55); color: #fff; font-size: .75rem; font-weight: 600;
	}
	.ba-label-before { left: 10px; }
	.ba-label-after  { right: 10px; }
	.ba-range {
		width: 100%; accent-color: var(--manual-brand);
		cursor: ew-resize;
	}

	/* ── Colors ──────────────────────────────────────────────────────────────── */
	.colors-wrap {
		display: flex;
		flex-direction: column;
		gap: clamp(1.65rem, 3vw, 2.5rem);
	}
	.palette-section {
		display: flex;
		flex-direction: column;
		gap: .9rem;
	}
	.palette-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(160px, 36%);
		gap: 1rem;
		align-items: end;
		padding-bottom: .75rem;
		border-bottom: 1px solid var(--manual-border);
	}
	.palette-title-wrap {
		display: flex;
		align-items: baseline;
		gap: .7rem;
		min-width: 0;
	}
	.palette-name {
		margin: 0;
		color: var(--manual-ink);
		font-size: .98rem;
		font-weight: 800;
		line-height: 1.2;
	}
	.palette-count {
		color: var(--manual-muted);
		font-size: .74rem;
		font-weight: 660;
		white-space: nowrap;
	}
	.palette-strip {
		display: flex;
		min-width: 0;
		height: 12px;
		overflow: hidden;
		border: 1px solid var(--manual-border);
		border-radius: 999px;
		background: var(--manual-surface);
	}
	.palette-strip-swatch {
		flex: 1 1 0;
		min-width: 18px;
	}
	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 232px), 282px));
		gap: 14px;
		justify-content: start;
		align-items: stretch;
	}
	.color-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--manual-border);
		border-radius: var(--manual-radius);
		background: var(--manual-surface);
		transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
	}
	.color-card:hover {
		border-color: color-mix(in srgb, var(--manual-brand) 32%, var(--manual-border));
		box-shadow: 0 12px 34px rgba(0,0,0,.08);
		transform: translateY(-1px);
	}
	.color-swatch {
		position: relative;
		display: flex;
		min-height: 132px;
		width: 100%;
		flex-direction: column;
		justify-content: flex-end;
		padding: .75rem;
		border: 0;
		text-align: left;
		cursor: pointer;
	}
	.color-swatch:hover .copy-hint,
	.color-swatch:focus-visible .copy-hint {
		opacity: .88;
	}
	.color-swatch:focus-visible,
	.cv-row:focus-visible,
	.shade-btn:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--manual-brand) 70%, #fff);
		outline-offset: 2px;
	}
	.swatch-copy-icon {
		position: absolute;
		top: .7rem;
		right: .7rem;
		z-index: 1;
		display: grid;
		width: 30px;
		height: 30px;
		place-items: center;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 12%, transparent);
		backdrop-filter: blur(8px);
	}
	.swatch-bottom {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: .25rem;
	}
	.swatch-hex-val {
		font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
		font-size: .88rem;
		font-weight: 780;
		letter-spacing: .035em;
	}
	.copy-hint,
	.copied-flash {
		font-size: .68rem;
		font-weight: 680;
		letter-spacing: .01em;
		opacity: .64;
	}
	.copy-hint { transition: opacity .16s ease; }
	.copied-flash { opacity: .9; }
	.color-details {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: .75rem;
		padding: .85rem .85rem .95rem;
	}
	.color-title-row {
		display: flex;
		align-items: start;
		justify-content: space-between;
		gap: .65rem;
	}
	.color-name {
		min-width: 0;
		color: var(--manual-ink);
		font-size: .94rem;
		font-weight: 780;
		line-height: 1.22;
	}
	.color-values {
		display: flex;
		flex-direction: column;
		gap: .18rem;
	}
	.cv-row {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 20px;
		align-items: center;
		gap: .45rem;
		min-height: 30px;
		padding: .2rem .28rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background .12s ease, color .12s ease;
	}
	.cv-row:hover {
		background: color-mix(in srgb, var(--manual-ink) 5%, transparent);
	}
	.cv-label {
		color: var(--manual-muted);
		font-size: .62rem;
		font-weight: 820;
		letter-spacing: .07em;
		text-transform: uppercase;
	}
	.cv-val {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-ink);
		font-size: .78rem;
		line-height: 1.35;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mono { font-family: "Fira Code", "SFMono-Regular", Consolas, monospace; }
	.cv-copy {
		display: grid;
		width: 20px;
		height: 20px;
		place-items: center;
		color: var(--manual-brand);
		opacity: 0;
		transition: opacity .12s ease;
	}
	.cv-row:hover .cv-copy,
	.cv-row:focus-visible .cv-copy { opacity: 1; }
	.production-detail {
		display: flex;
		flex-direction: column;
		gap: .35rem;
		padding-top: .7rem;
		border-top: 1px solid var(--manual-border);
	}
	.production-label {
		color: var(--manual-muted);
		font-size: .62rem;
		font-weight: 820;
		letter-spacing: .07em;
		text-transform: uppercase;
	}
	.production-list {
		display: flex;
		flex-direction: column;
		gap: .18rem;
	}
	.production-row {
		display: grid;
		grid-template-columns: minmax(54px, .9fr) minmax(0, 1.35fr) 20px;
		align-items: center;
		gap: .45rem;
		min-height: 30px;
		padding: .2rem .28rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: background .12s ease;
	}
	.production-row:hover {
		background: color-mix(in srgb, var(--manual-ink) 5%, transparent);
	}
	.production-row:hover .cv-copy,
	.production-row:focus-visible .cv-copy { opacity: 1; }
	.production-ref-label {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-muted);
		font-size: .68rem;
		font-weight: 760;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.production-ref-value {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-ink);
		font-size: .78rem;
		font-weight: 650;
		line-height: 1.35;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.contrast-detail {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: .55rem;
		padding-top: .75rem;
		border-top: 1px solid var(--manual-border);
	}
	.contrast-pair {
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		gap: .45rem;
		align-items: center;
		min-width: 0;
	}
	.contrast-sample {
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		border-radius: 6px;
		font-size: .8rem;
		font-weight: 900;
		line-height: 1;
	}
	.contrast-sample-white {
		border: 1px solid var(--manual-border);
		background: #fff;
	}
	.contrast-sample-black {
		background: #111;
	}
	.contrast-meta {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: .05rem;
	}
	.contrast-bg {
		overflow: hidden;
		color: var(--manual-muted);
		font-size: .62rem;
		font-weight: 680;
		line-height: 1.1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.contrast-meta strong {
		color: var(--manual-ink);
		font-size: .74rem;
		font-weight: 800;
		line-height: 1.2;
	}
	.contrast-meta em {
		color: #16a34a;
		font-size: .6rem;
		font-style: normal;
		font-weight: 840;
		letter-spacing: .05em;
		line-height: 1.1;
	}
	.contrast-pair.warn .contrast-meta em { color: #d97706; }
	.contrast-pair.fail .contrast-meta strong { color: #dc2626; }
	.contrast-pair.fail .contrast-meta em { display: none; }
	.shades-strip {
		display: flex;
		min-height: 28px;
		border-top: 1px solid var(--manual-border);
	}
	.shade-btn {
		position: relative;
		display: grid;
		flex: 1;
		min-width: 0;
		height: 28px;
		place-items: center;
		border: 0;
		cursor: pointer;
		transition: filter .12s ease, transform .12s ease;
	}
	.shade-btn:hover {
		z-index: 1;
		filter: brightness(.86);
	}
	.shade-btn::after {
		content: attr(data-label);
		position: absolute;
		bottom: calc(100% + 5px);
		left: 50%;
		z-index: 5;
		transform: translateX(-50%);
		padding: 2px 5px;
		border-radius: 4px;
		background: #111;
		color: #fff;
		font-size: .52rem;
		font-weight: 760;
		letter-spacing: .04em;
		opacity: 0;
		pointer-events: none;
		white-space: nowrap;
		transition: opacity .12s ease;
	}
	.shade-btn:hover::after,
	.shade-btn:focus-visible::after { opacity: 1; }
	.shade-flash {
		color: #fff;
		font-size: .66rem;
		font-weight: 900;
		mix-blend-mode: difference;
	}

	/* ── Typography ──────────────────────────────────────────────────────────── */
	.typo-fonts { display: flex; flex-direction: column; gap: 2.5rem; }
	.typo-font { display: flex; flex-direction: column; gap: 1rem; }
	.typo-specimen {
		padding: 1.5rem;
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: var(--manual-surface);
	}
	.specimen-alpha { font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 700; line-height: 1; color: var(--manual-ink); }
	.specimen-sentence { margin-top: .5rem; font-size: 1rem; color: var(--manual-muted); line-height: 1.6; }
	.typo-info { display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; }
	.font-name { font-size: .95rem; color: var(--manual-ink); }
	.font-meta { font-size: .8rem; color: var(--manual-muted); }
	.font-role {
		padding: 2px 8px; border-radius: 999px;
		background: color-mix(in srgb, var(--manual-brand) 10%, transparent);
		color: var(--manual-brand); font-size: .7rem; font-weight: 700; text-transform: uppercase;
	}
	.style-table-wrap { overflow-x: auto; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: var(--manual-surface); }
	.style-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
	.style-table th { padding: .6rem .9rem; text-align: left; font-size: .72rem; font-weight: 760; color: var(--manual-muted); text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid var(--manual-border); background: color-mix(in srgb, var(--manual-ink) 3%, var(--manual-surface)); }
	.style-table td { padding: .75rem .9rem; border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); vertical-align: middle; }
	.style-table tr:last-child td { border-bottom: none; }

	/* ── Logo spec ───────────────────────────────────────────────────────────── */
	.logo-spec { display: flex; flex-direction: column; gap: 1.25rem; }
	.logo-preview-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
	.logo-clearspace {
		display: flex; align-items: center; justify-content: center;
		border-radius: var(--manual-radius); border: 1px dashed var(--manual-border);
		background: var(--manual-surface);
		position: relative;
	}
	.logo-clearspace-dark {
		background: #111; border-color: rgba(255,255,255,.12);
	}
	.logo-preview-img { max-width: 100%; max-height: 160px; display: block; }
	.logo-clearspace-dark .logo-preview-img { filter: invert(1) brightness(2); }
	.logo-specs { display: flex; flex-wrap: wrap; gap: .65rem 1.5rem; }
	.logo-specs div { display: flex; flex-direction: column; gap: 2px; }
	.logo-specs dt { font-size: .72rem; color: var(--manual-muted); font-weight: 650; }
	.logo-specs dd { margin: 0; font-size: .94rem; font-weight: 760; color: var(--manual-ink); }

	/* ── Text styles ─────────────────────────────────────────────────────────── */
	.text-styles { display: flex; flex-direction: column; }
	.ts-row {
		display: flex; align-items: baseline; gap: 1rem;
		padding: .85rem 0; border-bottom: 1px solid var(--manual-border);
	}
	.ts-row:last-child { border-bottom: none; }
	.ts-preview { min-width: 0; flex: 1; color: var(--manual-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ts-meta { display: flex; gap: .55rem; flex-shrink: 0; color: var(--manual-muted); font-size: .75rem; }
	.ts-font { color: var(--manual-brand); }

	/* ── Cards ───────────────────────────────────────────────────────────────── */
	.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
	.info-card {
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: var(--manual-surface); overflow: hidden;
		display: flex; flex-direction: column;
	}
	.card-img-wrap { aspect-ratio: 16/9; overflow: hidden; }
	.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.card-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
	.card-title { font-size: .92rem; font-weight: 760; color: var(--manual-ink); display: block; }
	.card-desc { margin: 0; font-size: .84rem; color: var(--manual-muted); line-height: 1.55; }

	/* ── Chart ───────────────────────────────────────────────────────────────── */
	.chart-wrap { display: grid; grid-template-columns: 260px minmax(0,1fr); gap: 2rem; align-items: center; }
	.radar-chart { width: 100%; max-width: 260px; display: block; }
	.radar-grid { fill: none; stroke: var(--manual-border); stroke-width: 1; }
	.radar-axis { stroke: var(--manual-border); stroke-width: 1; }
	.radar-data {
		fill: color-mix(in srgb, var(--manual-brand) 18%, transparent);
		stroke: var(--manual-brand); stroke-width: 2;
	}
	.radar-label { font-size: 11px; fill: var(--manual-muted); }
	.chart-legend { display: flex; flex-direction: column; gap: .55rem; }
	.legend-row { display: grid; grid-template-columns: 110px 1fr 28px; align-items: center; gap: .6rem; }
	.legend-label { font-size: .82rem; color: var(--manual-ink); }
	.legend-bar-wrap { height: 6px; border-radius: 3px; background: var(--manual-border); overflow: hidden; }
	.legend-bar { height: 100%; border-radius: 3px; background: var(--manual-brand); }
	.legend-value { font-size: .78rem; color: var(--manual-muted); text-align: right; }

	/* ── Grid ────────────────────────────────────────────────────────────────── */
	.grid-spec { display: flex; flex-direction: column; gap: 1.25rem; }
	.grid-visual {
		height: 72px; display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		gap: var(--gutter); padding: 0 var(--margin); overflow: hidden;
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: var(--manual-surface);
	}
	.grid-col { background: color-mix(in srgb, var(--manual-brand) 14%, transparent); border-radius: 2px; }
	.grid-meta { display: flex; flex-wrap: wrap; gap: .65rem 1.35rem; }
	.grid-meta div { display: flex; align-items: baseline; gap: .4rem; }
	.grid-meta dt { color: var(--manual-muted); font-size: .75rem; font-weight: 650; }
	.grid-meta dd { margin: 0; color: var(--manual-ink); font-size: .9rem; font-weight: 760; }

	/* ── Do / Don't ──────────────────────────────────────────────────────────── */
	.do-dont-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
	.do-dont-item { padding: 18px; border-radius: var(--manual-radius); font-size: .92rem; line-height: 1.6; }
	.do-dont-item p { margin: 0; }
	.is-do { background: color-mix(in srgb, #22c55e 10%, var(--manual-surface)); border: 1px solid color-mix(in srgb, #22c55e 26%, var(--manual-border)); }
	.is-dont { background: color-mix(in srgb, #ef4444 9%, var(--manual-surface)); border: 1px solid color-mix(in srgb, #ef4444 24%, var(--manual-border)); }
	.do-dont-badge {
		display: inline-flex; align-items: center; gap: 5px; margin-bottom: .55rem;
		padding: 4px 8px; border-radius: 999px;
		background: color-mix(in srgb, var(--manual-surface) 78%, transparent);
		color: var(--manual-ink); font-size: .7rem; font-weight: 820;
		text-transform: uppercase; letter-spacing: .06em;
	}
	.is-do .do-dont-badge { color: #16a34a; }
	.is-dont .do-dont-badge { color: #dc2626; }

	/* ── Process ─────────────────────────────────────────────────────────────── */
	.process-list { list-style: none; display: flex; flex-direction: column; gap: .9rem; margin: 0; padding: 0; }
	.process-step { display: flex; gap: 1rem; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid var(--manual-border); }
	.process-step:last-child { border-bottom: 0; }
	.step-num { width: 30px; height: 30px; border-radius: 50%; background: var(--manual-brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 800; flex-shrink: 0; }
	.step-title { margin-bottom: .2rem; color: var(--manual-ink); font-weight: 760; font-size: .96rem; }
	.step-desc { margin: 0; color: var(--manual-muted); font-size: .9rem; line-height: 1.65; }

	/* ── Accordion ───────────────────────────────────────────────────────────── */
	.accordion { display: flex; flex-direction: column; gap: .6rem; }
	.accordion-item { overflow: hidden; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: var(--manual-surface); }
	.accordion-q {
		display: flex; align-items: center; justify-content: space-between;
		padding: .95rem 1rem; color: var(--manual-ink); font-weight: 720; font-size: .94rem;
		cursor: pointer; list-style: none;
	}
	.accordion-q::-webkit-details-marker { display: none; }
	:global(.accordion-icon) { flex-shrink: 0; transition: transform .2s; }
	details[open] :global(.accordion-icon) { transform: rotate(90deg); }
	.accordion-a { padding: 0 1rem 1rem; color: var(--manual-muted); font-size: .9rem; line-height: 1.72; }

	/* ── Table ───────────────────────────────────────────────────────────────── */
	.table-wrap { overflow-x: auto; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: var(--manual-surface); }
	.block-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
	.block-table th { text-align: left; padding: .75rem .9rem; background: color-mix(in srgb, var(--manual-ink) 5%, var(--manual-surface)); border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); font-weight: 760; }
	.block-table td { padding: .75rem .9rem; border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); }
	.block-table tr:last-child td { border-bottom: none; }

	/* ── HTML / Code ─────────────────────────────────────────────────────────── */
	.html-preview { margin-bottom: .85rem; padding: 1.5rem; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: var(--manual-surface); }
	.code-block { overflow-x: auto; margin: 0; padding: 1rem 1.15rem; border-radius: var(--manual-radius); background: #171717; color: #f7f7f7; font-family: "Fira Code", "SFMono-Regular", Consolas, monospace; font-size: .84rem; line-height: 1.65; white-space: pre; }

	/* ── Typo rules ──────────────────────────────────────────────────────────── */
	.tr-tabs {
		display: flex; gap: 2px; border-bottom: 1px solid var(--manual-border); margin-bottom: 1rem;
	}
	.tr-tab {
		padding: 6px 16px; font-size: .84rem; font-weight: 600;
		border: none; background: transparent; color: var(--manual-muted); cursor: pointer;
		border-bottom: 2px solid transparent; margin-bottom: -1px;
		transition: color .14s, border-color .14s;
	}
	.tr-tab:hover { color: var(--manual-ink); }
	.tr-tab.active { color: var(--manual-brand); border-bottom-color: var(--manual-brand); }

	.tr-table-wrap { overflow-x: auto; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: var(--manual-surface); }
	.tr-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
	.tr-table th {
		text-align: left; padding: .65rem .9rem;
		font-size: .7rem; font-weight: 760; color: var(--manual-muted);
		text-transform: uppercase; letter-spacing: .05em;
		border-bottom: 1px solid var(--manual-border);
		background: color-mix(in srgb, var(--manual-ink) 3%, var(--manual-surface));
	}
	.tr-table td {
		padding: .75rem .9rem; border-bottom: 1px solid var(--manual-border);
		color: var(--manual-ink); vertical-align: middle; line-height: 1.55;
	}
	.tr-table tr:last-child td { border-bottom: none; }
	.tr-cat { font-weight: 720; color: var(--manual-ink); white-space: nowrap; }
	.tr-correct {
		font-family: "Fira Code", "SFMono-Regular", monospace; font-size: .82rem;
		color: #16a34a;
		background: color-mix(in srgb, #22c55e 8%, var(--manual-surface));
	}
	.tr-wrong {
		font-family: "Fira Code", "SFMono-Regular", monospace; font-size: .82rem;
		color: #dc2626;
		background: color-mix(in srgb, #ef4444 8%, var(--manual-surface));
	}

	/* ── Responsive ──────────────────────────────────────────────────────────── */
	@media (max-width: 680px) {
		.palette-head {
			grid-template-columns: 1fr;
			gap: .65rem;
			align-items: start;
		}
		.palette-title-wrap {
			flex-wrap: wrap;
			gap: .35rem .65rem;
		}
		.palette-strip {
			width: 100%;
			height: 10px;
		}
		.color-grid {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.color-swatch {
			min-height: 118px;
		}
		.contrast-detail {
			grid-template-columns: 1fr;
		}
		.chart-wrap { grid-template-columns: 1fr; }
		.radar-chart { max-width: 220px; margin: 0 auto; }
		.logo-preview-wrap { grid-template-columns: 1fr; }
		.legend-row { grid-template-columns: 90px 1fr 24px; }
	}
</style>
