<script lang="ts">
	import { colorsForSource } from '$lib/manual/color-source';
	import {
		IconCancel, IconExclamationCircle, IconChevronRight, IconChevronLeft, IconDownload, IconCheck, IconCopy, IconX,
		IconInfoCircle, IconCircleCheck, IconAlertTriangle, IconArrowUpRight, IconArrowsHorizontal, IconQuote, IconPlayerPlay
	} from '$lib/icons';
	import ManualBlockShell from './ManualBlockShell.svelte';
	import Lightbox, { type LightboxImage } from './Lightbox.svelte';
	import LogoDownload from './LogoDownload.svelte';
	import FontSpecimen from './FontSpecimen.svelte';
	import { sanitizeRichHtml } from '$lib/utils/sanitize-rich-html';
	import { useManualStrings } from '$lib/manual/ui-strings';
	import { resolveEmbed } from '$lib/manual/embed';

	const strings = useManualStrings();
	const t = $derived(strings());

	type Block = {
		id: string; type: string;
		config: Record<string, unknown>;
		anchor: string | null;
		enabled: boolean;
	};
	type RichContentItem = { type: 'text' | 'attention' | 'alert'; html: string };
	type ProductionRef = { type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other'; label: string; value: string };
	type ColorRow    = { id: string; name: string; hex: string; rgb: { r:number;g:number;b:number } | null; cmyk: { c:number;m:number;y:number;k:number } | null; hsl: { h:number;s:number;l:number } | null; pantoneRef: string | null; ralRef: string | null; productionRefs?: ProductionRef[] | null; paletteId: string | null; order: number };
	type PaletteRow  = { id: string; name: string; order: number };
	type FontRow     = { id: string; name: string; foundry: string | null; role: string | null; license?: string | null; sourceUrl: string | null; weights: number[] | null; isVariable: boolean | null; variableAxes?: { tag: string; label: string; min: number; max: number; default: number }[] | null; order: number };
	type StyleRow    = { id: string; fontId: string | null; name: string; tag: string | null; size: number | null; lineHeight: number | null; tracking: number | null; weight: number | null; order: number };
	type FontFileRow = { id: string; fontId: string; storagePath: string; format: string; isVariable: boolean | null; fileSize?: number | null };
	type AssetRow = { id: string; filename: string; mime: string; size: number; storagePath: string; thumbnailPath: string | null; folderId: string | null; tags: string[] | null };

	const {
		block,
		colorRows    = [],
		paletteRows  = [],
		fontRows     = [],
		styleRows    = [],
		fontFileRows = [],
		assetRows    = [],
	}: {
		block: Block;
		colorRows?: ColorRow[];
		paletteRows?: PaletteRow[];
		fontRows?: FontRow[];
		styleRows?: StyleRow[];
		fontFileRows?: FontFileRow[];
		assetRows?: AssetRow[];
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

	function assetsForBlock(config: Record<string, unknown>, imagesOnly = false, requireFolder = false): AssetRow[] {
		const folderId = typeof config.folderId === 'string' && config.folderId ? config.folderId : null;
		if (requireFolder && !folderId) return [];
		const tags = typeof config.tags === 'string'
			? config.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
			: [];
		return assetRows.filter((asset) => {
			if (imagesOnly && !asset.mime.startsWith('image/')) return false;
			if (folderId && asset.folderId !== folderId) return false;
			if (tags.length && !tags.every((tag) => (asset.tags ?? []).includes(tag))) return false;
			return true;
		});
	}

	function assetPreview(asset: AssetRow): string | null {
		if (asset.thumbnailPath) return assetSrc(asset.thumbnailPath);
		if (asset.mime.startsWith('image/')) return assetSrc(asset.storagePath);
		return null;
	}

	// Photographs fill their frame; graphics (logos, icons, illustrations —
	// usually vector or transparent) are shown whole, never cropped.
	function isPhoto(asset: AssetRow): boolean {
		return /^image\/(jpe?g|heic|heif|avif)$/i.test(asset.mime);
	}

	function assetExt(asset: AssetRow): string {
		return (asset.filename.split('.').pop() ?? '').toUpperCase();
	}

	function assetDownload(asset: AssetRow): string {
		return assetSrc(asset.storagePath);
	}

	function formatBytes(value: number): string {
		if (value < 1024) return `${value} B`;
		if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
		return `${(value / (1024 * 1024)).toFixed(1)} MB`;
	}

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
	}

	function markdownFallback(value: unknown) {
		const text = String(value ?? '').trim();
		if (!text) return '';
		const inline = (s: string) => s
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
		return text.split(/\n{2,}/).map(part => `<p>${inline(escapeHtml(part)).replace(/\n/g, '<br>')}</p>`).join('');
	}

	function richContent(config: Record<string, unknown>): RichContentItem[] {
		if (Array.isArray(config.content)) {
			return config.content
				.map((item) => {
					const record = item as Record<string, unknown>;
					const type: RichContentItem['type'] =
						record.type === 'attention' || record.type === 'alert' ? record.type : 'text';
					return { type, html: sanitizeRichHtml(record.html) };
				})
				.filter((item) => item.html.trim());
		}
		const fallback = markdownFallback(config.markdown);
		return fallback ? [{ type: 'text', html: fallback }] : [];
	}

	function sandboxedHtmlPreview(value: unknown): string {
		return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; font-src https: data:;"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{margin:16px;font:14px/1.5 system-ui,sans-serif;color:#171717}</style></head><body>${String(value ?? '')}</body></html>`;
	}

	function cssQuoted(value: string): string {
		return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n\f]/g, ' ');
	}

	function uploadFontUrl(storagePath: string): string {
		return `/uploads/${storagePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
	}

	function externalStylesheetUrl(value: string | null): string | null {
		if (!value) return null;
		try {
			const url = new URL(value);
			return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
		} catch {
			return null;
		}
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

	function wcagBadge(ratio: number): 'AAA' | 'AA' | 'AA Large' | null {
		if (ratio >= 7)   return 'AAA';
		if (ratio >= 4.5) return 'AA';
		if (ratio >= 3)   return 'AA Large';
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
		let h: number;
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
	const filteredColors = $derived(colorsForSource(colorRows, paletteRows, block.config.source));

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
				`url('${cssQuoted(uploadFontUrl(f.storagePath))}') format('${cssQuoted(f.format)}')`
			).join(', ');
			const weights = (font.weights ?? [400]).filter((weight) => Number.isInteger(weight) && weight >= 1 && weight <= 1000);
			return weights.map(w => `@font-face { font-family: '${cssQuoted(font.name)}'; src: ${srcs}; font-weight: ${w}; font-display: swap; }`).join('\n');
		}).join('\n');
	});
	const externalStylesheets = $derived(
		fontRows
			.map((font) => externalStylesheetUrl(font.sourceUrl))
			.filter((href, index, all): href is string => Boolean(href) && all.indexOf(href) === index)
	);

	const anchorId = $derived(block.anchor ?? (block.config.heading ? slugify(String(block.config.heading)) : undefined));

	// colours: display variant + value format shown on swatches
	type ColorFormat = 'hex' | 'rgb' | 'cmyk' | 'hsl' | 'pantone' | 'ral';
	let colorFormat = $state<ColorFormat>('hex');
	const colorDisplay = $derived(['swatches', 'compact'].includes(String(block.config.display)) ? String(block.config.display) : 'cards');
	const availableFormats = $derived.by(() => {
		const list: { id: ColorFormat; label: string }[] = [
			{ id: 'hex', label: 'HEX' }, { id: 'rgb', label: 'RGB' }, { id: 'cmyk', label: 'CMYK' }, { id: 'hsl', label: 'HSL' },
		];
		if (filteredColors.some((c) => productionRefsFor(c).some((r) => r.type === 'pantone'))) list.push({ id: 'pantone', label: 'Pantone' });
		if (filteredColors.some((c) => productionRefsFor(c).some((r) => r.type === 'ral'))) list.push({ id: 'ral', label: 'RAL' });
		return list;
	});
	function colorValue(color: ColorRow, format: ColorFormat): string {
		if (format === 'rgb') return `RGB(${hexToRgbStr(color.hex, color)})`;
		if (format === 'cmyk') return fmtCmyk(color.cmyk ?? computeCmyk(color.hex));
		if (format === 'hsl') return fmtHsl(color.hsl ?? computeHsl(color.hex));
		if (format === 'pantone' || format === 'ral') return productionRefsFor(color).find((r) => r.type === format)?.value ?? '—';
		return color.hex.toUpperCase();
	}

	// contrast checker + hotspots
	// svelte-ignore state_referenced_locally
	let contrastFg = $state(typeof block.config.foreground === 'string' ? block.config.foreground : (colorRows[0]?.hex ?? '#171717'));
	// svelte-ignore state_referenced_locally
	let contrastBg = $state(typeof block.config.background === 'string' ? block.config.background : '#ffffff');
	let activeHotspot = $state<number | null>(null);

	// before/after slider state
	let sliderValue = $state(50);
	// lightbox (image + gallery blocks)
	let lightboxIndex = $state<number | null>(null);
	let lightboxImages = $state<LightboxImage[]>([]);
	function openLightbox(images: LightboxImage[], index: number) {
		lightboxImages = images;
		lightboxIndex = index;
	}
	// carousel
	let carouselEl = $state<HTMLElement | null>(null);
	let carouselAtStart = $state(true);
	let carouselAtEnd = $state(false);
	function updateCarouselEdges() {
		if (!carouselEl) return;
		carouselAtStart = carouselEl.scrollLeft <= 4;
		carouselAtEnd = carouselEl.scrollLeft + carouselEl.clientWidth >= carouselEl.scrollWidth - 4;
	}
	function scrollCarousel(dir: 1 | -1) {
		if (!carouselEl) return;
		carouselEl.scrollBy({ left: dir * carouselEl.clientWidth * 0.8, behavior: 'smooth' });
	}
	$effect(() => {
		if (!carouselEl) return;
		updateCarouselEdges();
		const ro = new ResizeObserver(updateCarouselEdges);
		ro.observe(carouselEl);
		return () => ro.disconnect();
	});

	// ── Generic helpers for the newer blocks ─────────────────────────────────
	function list<T = Record<string, unknown>>(key: string): T[] {
		const value = block.config[key];
		return Array.isArray(value) ? (value as T[]) : [];
	}
	function cfgStr(key: string, fallback = ''): string {
		const value = block.config[key];
		return typeof value === 'string' ? value : fallback;
	}
	function isExternal(href: string): boolean {
		return /^https?:\/\//i.test(href);
	}
	function hostOf(href: string): string {
		try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return ''; }
	}
	function linkHref(href: string): string {
		if (isExternal(href) || /^(\/|#|mailto:|tel:)/.test(href)) return href;
		return `https://${href}`;
	}
	// typo_rules tab state
	let typoRulesTab = $state(0);
</script>

<svelte:head>
	{#if fontFaces}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- CSS is generated from escaped, validated font metadata. -->
		{@html `<style>${fontFaces}</style>`}
	{/if}
	{#each externalStylesheets as href (href)}
		<link rel="stylesheet" {href} />
	{/each}
</svelte:head>

{#if !block.enabled}
	<!-- hidden -->

{:else if block.type === 'divider'}
	{@const dividerStyle = cfgStr('style') || 'line'}
	<div class="divider divider-{dividerStyle}" id={anchorId} role="separator" style="--divider-space:{Math.min(20, Math.max(0, Number(block.config.spacing ?? 4)))}rem"></div>

{:else if block.type === 'rich_text'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if richContent(block.config).length}
			<div class="rich-flow">
				{#each richContent(block.config) as item, itemIndex (itemIndex)}
					{#if item.type === 'text'}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
						<div class="prose">{@html item.html}</div>
					{:else}
						<div class="content-callout" class:alert={item.type === 'alert'}>
							<div class="content-callout-icon" aria-hidden="true">
								{#if item.type === 'alert'}<IconCancel size={18} stroke={1.9} />{:else}<IconExclamationCircle size={18} stroke={1.9} />{/if}
							</div>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
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
			<figure class="img-figure" class:full-width={block.config.fullWidth}
					class:framed={block.config.frame}
					style={block.config.frame
						? [
							`background:${block.config.frameBg || '#ffffff'}`,
							block.config.frameBorderColor
								? `border:1px solid ${block.config.frameBorderColor}`
								: 'border:none'
							].join(';')
						: ''}>
				{#if block.config.zoom !== false}
					<button class="zoom-btn" aria-label={t.openImage} onclick={() => openLightbox([{ src: assetSrc(block.config.url), alt: String(block.config.alt ?? ''), caption: block.config.caption ? String(block.config.caption) : undefined, download: assetSrc(block.config.url) }], 0)}>
						<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" loading="lazy" decoding="async" />
					</button>
				{:else}
					<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" loading="lazy" decoding="async" />
				{/if}
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
						<img src={assetSrc(block.config.beforeUrl)} alt={String(block.config.beforeLabel ?? t.before)} loading="lazy" decoding="async" />
						{#if block.config.beforeLabel}<span class="ba-label ba-label-before">{block.config.beforeLabel}</span>{/if}
					</div>
					<div class="ba-after">
						<img src={assetSrc(block.config.afterUrl)} alt={String(block.config.afterLabel ?? t.after)} loading="lazy" decoding="async" />
						{#if block.config.afterLabel}<span class="ba-label ba-label-after">{block.config.afterLabel}</span>{/if}
					</div>
					<div class="ba-divider" style="left:{sliderValue}%">
						<div class="ba-handle"><IconArrowsHorizontal size={18} stroke={2} /></div>
					</div>
					<input type="range" min="0" max="100" step="0.5" bind:value={sliderValue} class="ba-range" aria-label={t.compare} />
				</div>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'colors'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if filteredColors.length && colorDisplay !== 'cards'}
			<div class="colors-wrap">
				<div class="format-tabs" role="tablist" aria-label={t.colorFormat}>
					{#each availableFormats as f (f.id)}
						<button role="tab" aria-selected={colorFormat === f.id} class:active={colorFormat === f.id} onclick={() => (colorFormat = f.id)}>{f.label}</button>
					{/each}
				</div>
				{#each colorsByPalette as group, gi (group.palette?.id ?? '__unassigned')}
					<section class="palette-section" aria-label={group.palette?.name ?? t.colors}>
						{#if block.config.showPaletteNames !== false && colorsByPalette.length > 1}
							<h3 class="palette-name">{group.palette?.name ?? t.colors}</h3>
						{/if}
						<div class={colorDisplay === 'compact' ? 'swatch-compact' : 'swatch-grid'} data-group={gi}>
							{#each group.colors as color (color.id)}
								{@const value = colorValue(color, colorFormat)}
								{@const key = `sw-${color.id}-${colorFormat}`}
								<button
									class="swatch-tile"
									style="background:{color.hex}; color:{contrastOnColor(color.hex)}"
									onclick={() => copyValue(key, value)}
									aria-label="{color.name}: {t.copy} {value}"
								>
									<span class="swatch-tile-name">{color.name}</span>
									<span class="swatch-tile-value">
										{#if copiedKey === key}<IconCheck size={14} stroke={2.4} /> {t.copied}{:else}{value}{/if}
									</span>
								</button>
							{/each}
						</div>
					</section>
				{/each}
			</div>
		{:else if filteredColors.length}
			<div class="colors-wrap">
				{#each colorsByPalette as group, gi (group.palette?.id ?? '__unassigned')}
					<section class="palette-section" aria-labelledby={block.config.showPaletteNames !== false ? `palette-${block.id}-${gi}` : undefined}>
						<div class="palette-head">
							<div class="palette-title-wrap">
								{#if block.config.showPaletteNames !== false}
									<h3 id="palette-{block.id}-{gi}" class="palette-name">
										{group.palette?.name ?? t.colors}
									</h3>
								{/if}
								<span class="palette-count">{t.colorCount(group.colors.length)}</span>
							</div>
							<div class="palette-strip" aria-hidden="true">
							{#each group.colors as stripColor (stripColor.id)}
									<span class="palette-strip-swatch" style="background:{stripColor.hex}"></span>
								{/each}
							</div>
						</div>

						<div class="color-grid">
					{#each group.colors as color (color.id)}
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
									title="{t.copy} {hex}"
									aria-label="{t.copy} {hex}"
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
											<span class="copied-flash">{t.copied}</span>
										{:else}
											<span class="copy-hint">{t.copyHex}</span>
										{/if}
									</div>
								</button>

								<div class="color-details">
									<div class="color-title-row">
										<strong class="color-name">{color.name}</strong>
									</div>

									{#if block.config.showCodes !== false}
										<div class="color-values">
											<button class="cv-row" onclick={() => copyValue(`h-${color.id}`, hex)} title="{t.copy} HEX">
												<span class="cv-label">HEX</span>
												<span class="cv-val mono">{hex}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `h-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`r-${color.id}`, rgbStr)} title="{t.copy} RGB">
												<span class="cv-label">RGB</span>
												<span class="cv-val mono">{rgbStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `r-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`hsl-${color.id}`, hslStr)} title="{t.copy} HSL">
												<span class="cv-label">HSL</span>
												<span class="cv-val mono">{hslStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `hsl-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											<button class="cv-row" onclick={() => copyValue(`c-${color.id}`, cmykStr)} title="{t.copy} CMYK">
												<span class="cv-label">CMYK</span>
												<span class="cv-val mono">{cmykStr}</span>
												<span class="cv-copy" aria-hidden="true">
													{#if copiedKey === `c-${color.id}`}<IconCheck size={13} stroke={2.5} />{:else}<IconCopy size={13} stroke={1.8} />{/if}
												</span>
											</button>
											{#if color.ralRef}
												<button class="cv-row" onclick={() => copyValue(`rl-${color.id}`, color.ralRef!)} title="{t.copy} RAL">
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
												<div class="production-label">{t.production}</div>
												<div class="production-list">
											{#each productionRefs as ref, refIndex (`${ref.type}-${ref.value}-${refIndex}`)}
														<button
															class="production-row"
															onclick={() => copyValue(`prod-${color.id}-${refIndex}`, ref.value)}
															title="{t.copy} {ref.label}"
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
														<span class="contrast-bg">{t.onWhite}</span>
														<strong>{crWhite}:1</strong>
														{#if badgeWhite}<em>{badgeWhite}</em>{/if}
													</span>
												</div>
												<div class="contrast-pair" class:pass={crBlack >= 4.5} class:warn={crBlack >= 3 && crBlack < 4.5} class:fail={crBlack < 3}>
													<span class="contrast-sample contrast-sample-black" style="color:{color.hex}">A</span>
													<span class="contrast-meta">
														<span class="contrast-bg">{t.onBlack}</span>
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
						{#each shades as shade (shade.label)}
											<button
												class="shade-btn"
												style="background:{shade.hex}"
												data-label={shade.label}
												onclick={() => copyValue(`s-${color.id}-${shade.label}`, shade.hex.toUpperCase())}
												title="{shade.label}: {shade.hex.toUpperCase()}"
												aria-label="{t.copy} {shade.label}: {shade.hex.toUpperCase()}"
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
			<div class="muted-block"><span class="placeholder-copy">{t.noColors}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'typography'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const pickedFontIds = list<string>('fontIds')}
		{@const shownFonts = pickedFontIds.length ? fontRows.filter(f => pickedFontIds.includes(f.id)) : fontRows}
		{#if shownFonts.length}
			<div class="typo-fonts">
				{#each shownFonts as font (font.id)}
					{@const styles = styleRows.filter(s => s.fontId === font.id).sort((a,b) => a.order - b.order)}
					<div class="typo-font">
						<FontSpecimen
							{font}
							files={fontFileRows.filter(f => f.fontId === font.id)}
							blockId={block.id}
							allowDownload={block.config.allowDownload === true}
							description={shownFonts.length === 1 ? cfgStr('fontDescription') : ''}
							sections={{
								weights: block.config.showWeights !== false,
								info: block.config.showInfo !== false,
								glyphs: block.config.showGlyphs !== false,
								tester: block.config.showTester !== false,
							}}
						/>
						{#if block.config.showStyles !== false && styles.length}
							<div class="style-table-wrap">
								<table class="style-table">
									<thead><tr>
										<th>{t.style}</th><th>{t.size}</th><th>{t.lineHeight}</th><th>{t.weight}</th><th>{t.tracking}</th>
									</tr></thead>
									<tbody>
								{#each styles as style (style.id)}
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
			<div class="muted-block"><span class="placeholder-copy">{t.noFonts}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'logo_spec'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if block.config.logoUrl}
			<div class="logo-spec">
				<div class="logo-preview-wrap" style="--cz:{Math.min(3, Math.max(0.1, Number(block.config.clearspace ?? 1)))}">
					<div class="logo-stage">
						<div class="logo-zone">
							<span class="logo-zone-label">{t.clearZone}</span>
							<img src={assetSrc(block.config.logoUrl)} alt="Logo" class="logo-preview-img" />
						</div>
					</div>
					<div class="logo-stage logo-stage-dark">
						<div class="logo-zone">
							<span class="logo-zone-label">{t.clearZone}</span>
							<img
								src={assetSrc(block.config.logoDarkUrl || block.config.logoUrl)}
								alt="Logo"
								class="logo-preview-img"
								class:auto-invert={!block.config.logoDarkUrl}
							/>
						</div>
					</div>
				</div>
				<dl class="logo-specs">
					{#if block.config.clearspace != null}
						<div><dt>{t.clearspace}</dt><dd>{block.config.clearspace}{t.xHeight}</dd></div>
					{/if}
					{#if block.config.minSizePx != null}
						<div><dt>{t.minSize}</dt><dd>{block.config.minSizePx}px / {block.config.minSizeMm ?? '—'}mm</dd></div>
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
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- markdownFallback() escapes input before adding paragraph markup. -->
			<div class="prose">{@html markdownFallback(block.config.markdown)}</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'text_styles'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if styleRows.length}
			<div class="text-styles">
				{#each styleRows as style (style.id)}
					{@const font = fontRows.find(f => f.id === style.fontId)}
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
			<div class="muted-block"><span class="placeholder-copy">{t.noStyles}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'grid'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const gcols     = Math.max(1, Number(block.config.columns ?? 12))}
		{@const grows     = Math.max(0, Number(block.config.rows ?? 0))}
		{@const ggutter   = Number(block.config.gutter ?? 24)}
		{@const ggutterR  = Number(block.config.gutterRow ?? ggutter)}
		{@const gunit     = String(block.config.unit ?? (String(block.config.medium ?? 'web') === 'print' ? 'mm' : 'px'))}
		{@const gmedium   = String(block.config.medium ?? 'web')}
		{@const gformat   = String(block.config.format ?? (gmedium === 'print' ? 'A4' : 'web'))}
		{@const gorient   = String(block.config.orientation ?? 'portrait')}
		{@const gbaseline = Number(block.config.baselineGrid ?? 0)}
		<!-- 4-sided margins -->
		{@const gmarginBase = Number(block.config.margin ?? 40)}
		{@const gmT = Number(block.config.marginTop    ?? gmarginBase)}
		{@const gmR = Number(block.config.marginRight  ?? gmarginBase)}
		{@const gmB = Number(block.config.marginBottom ?? gmarginBase)}
		{@const gmL = Number(block.config.marginLeft   ?? gmarginBase)}
		<!-- Reference document dimensions in native units -->
		{@const FDIMS = { web:[Number(block.config.maxWidth??1280),720], A4:[210,297], A3:[420,297], A5:[148,210], Letter:[216,279], square:[1000,1000], story:[1000,1778] } as Record<string, number[]>}
		{@const fdim  = FDIMS[gformat] ?? FDIMS['web']}
		{@const docW  = gorient === 'landscape' && fdim[0] < fdim[1] ? fdim[1] : gorient === 'portrait' && fdim[0] > fdim[1] ? fdim[1] : fdim[0]}
		{@const docH  = gorient === 'landscape' && fdim[0] < fdim[1] ? fdim[0] : gorient === 'portrait' && fdim[0] > fdim[1] ? fdim[0] : fdim[1]}
		<!-- SVG internal coordinate space (docW → 800 units) -->
		{@const SW   = 800}
		{@const SH   = Math.round(SW * docH / docW)}
		{@const smgL = gmL / docW * SW}
		{@const smgR = gmR / docW * SW}
		{@const smgT = gmT / docH * SH}
		{@const smgB = gmB / docH * SH}
		{@const sgt  = ggutter  / docW * SW}
		{@const sgtR = ggutterR / docH * SH}
		{@const iW   = Math.max(0, SW - smgL - smgR)}
		{@const iH   = Math.max(0, SH - smgT - smgB)}
		<!--
			Display dimensions: SVG element gets explicit width/height so the browser
			knows the intrinsic aspect ratio — no weird white space from `width:100%`.
			Portrait print formats are capped at 380px tall; web/social stay around 200px.
		-->
		{@const maxHNum  = gmedium === 'print' ? 380 : gformat === 'story' ? 320 : gformat === 'square' ? 240 : 200}
		{@const dispH    = maxHNum}
		{@const dispW    = Math.round(maxHNum * docW / docH)}
		<!--
			Annotation sizes are computed in SVG units so they appear ≈11 px on screen
			regardless of format (portrait A4 vs wide web differ 2× in scale).
		-->
		{@const svgScale = dispH / SH}
		{@const annFS    = Math.max(20, Math.round(11 / svgScale))}
		{@const annTk    = Math.max(11, Math.round(5.5 / svgScale))}
		{@const annSW    = Math.max(1,  Math.round(0.9 / svgScale))}
		<!--
			Overflow-safe column/gutter display widths.
			Configured gutter+margin may exceed content width (e.g. 12 cols × 24 mm on A4).
			In that case we proportionally redistribute space so the visual always looks right;
			annotation labels still show the real configured values.
		-->
		{@const rawColW    = (iW - (gcols - 1) * sgt) / gcols}
		{@const minVisColW = iW * 0.042}
		{@const overflowed = rawColW < minVisColW}
		{@const effSgt     = overflowed
			? Math.max(0.5, (iW - gcols * minVisColW) / Math.max(1, gcols - 1))
			: sgt}
		{@const colW       = overflowed ? minVisColW : rawColW}
		<!-- Rows: same overflow protection -->
		{@const rawRowH    = grows > 0 ? (iH - (grows - 1) * sgtR) / grows : iH}
		{@const minVisRowH = iH * 0.04}
		{@const rowsOvf    = grows > 0 && rawRowH < minVisRowH}
		{@const effSgtR    = rowsOvf ? Math.max(0.5, (iH - grows * minVisRowH) / Math.max(1, grows - 1)) : sgtR}
		{@const rowH       = grows > 0 ? (rowsOvf ? minVisRowH : rawRowH) : iH}
		<!-- Baseline grid pitch in SVG units -->
		{@const sBaselineH = gbaseline > 0 ? (gbaseline / docH * SH) : 0}
		<!-- Show annotations only when the measured space is ≥14 px on screen -->
		{@const showLeftAnn   = smgL * svgScale >= 14}
		{@const showTopAnn    = smgT * svgScale >= 12}
		{@const showGutterAnn = gcols >= 2 && effSgt * svgScale >= 9 && !overflowed}
		<!-- Margin display label -->
		{@const marginsEqual = gmT === gmR && gmR === gmB && gmB === gmL}
		{@const marginLabel  = marginsEqual ? `${gmT} ${gunit}` : `${gmT} / ${gmR} / ${gmB} / ${gmL} ${gunit}`}
		<div class="grid-spec">
			<!--
				`width` and `height` attributes give the browser an intrinsic size so
				`max-width:100%; height:auto` in CSS scales it proportionally — no whitespace bands.
			-->
			<svg class="grid-svg"
				viewBox="0 0 {SW} {SH}"
				width={dispW}
				height={dispH}
				aria-hidden="true"
				preserveAspectRatio="xMidYMid meet">
				<!-- Page background -->
				<rect width={SW} height={SH} rx="2" fill="var(--manual-surface)" />
				<!-- Margin / content-area tint -->
				<rect x={smgL} y={smgT} width={iW} height={iH}
					fill="color-mix(in srgb,var(--manual-brand) 4%,transparent)" />

				<!-- Baseline grid lines -->
				{#if sBaselineH > 2}
					{@const blCount = Math.ceil(iH / sBaselineH)}
					{#each Array(blCount + 1) as _,li (li)}
						{@const ly = smgT + li * sBaselineH}
						{#if ly <= smgT + iH + 0.5}
							<line x1={smgL} y1={ly} x2={smgL + iW} y2={ly}
								stroke="color-mix(in srgb,var(--manual-brand) 22%,transparent)"
								stroke-width={annSW * 0.65} />
						{/if}
					{/each}
				{/if}

				<!-- Columns / cells -->
			{#each Array(gcols) as _,ci (ci)}
					{@const cx = smgL + ci * (colW + effSgt)}
					{#if grows > 0}
					{#each Array(grows) as _,ri (ri)}
							{@const ry = smgT + ri * (rowH + effSgtR)}
							<rect x={cx} y={ry} width={colW} height={rowH}
								fill="color-mix(in srgb,var(--manual-brand) 18%,transparent)"
								stroke="color-mix(in srgb,var(--manual-brand) 22%,transparent)"
								stroke-width={annSW * 0.4} />
						{/each}
					{:else}
						<rect x={cx} y={smgT} width={colW} height={iH}
							fill="color-mix(in srgb,var(--manual-brand) 18%,transparent)" />
					{/if}
				{/each}

				<!-- ── Dimension annotations ──────────────────────────────────── -->

				<!-- Left margin -->
				{#if showLeftAnn}
					{@const ay = smgT + iH * 0.5}
					<line x1={annSW}      y1={ay - annTk} x2={annSW}      y2={ay + annTk} stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)" stroke-width={annSW} />
					<line x1={smgL - annSW} y1={ay - annTk} x2={smgL - annSW} y2={ay + annTk} stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)" stroke-width={annSW} />
					<line x1={annSW} y1={ay} x2={smgL - annSW} y2={ay}
						stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)"
						stroke-width={annSW}
						stroke-dasharray="{annFS * 0.28} {annFS * 0.18}" />
					{#if smgL * svgScale >= 26}
						<text x={smgL / 2} y={ay - annTk - annFS * 0.18}
							text-anchor="middle"
							fill="color-mix(in srgb,var(--manual-muted) 70%,transparent)"
							font-size={annFS} font-family="system-ui,sans-serif" font-weight="500"
						>{gmL}{gunit}</text>
					{/if}
				{/if}

				<!-- Top margin -->
				{#if showTopAnn}
					{@const ax = smgL + iW * 0.68}
					<line x1={ax - annTk} y1={annSW}        x2={ax + annTk} y2={annSW}        stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)" stroke-width={annSW} />
					<line x1={ax - annTk} y1={smgT - annSW} x2={ax + annTk} y2={smgT - annSW} stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)" stroke-width={annSW} />
					<line x1={ax} y1={annSW} x2={ax} y2={smgT - annSW}
						stroke="color-mix(in srgb,var(--manual-muted) 48%,transparent)"
						stroke-width={annSW}
						stroke-dasharray="{annFS * 0.28} {annFS * 0.18}" />
					{#if smgT * svgScale >= 22}
						<text x={ax + annFS * 0.8} y={smgT / 2 + annFS * 0.38}
							text-anchor="start"
							fill="color-mix(in srgb,var(--manual-muted) 70%,transparent)"
							font-size={annFS} font-family="system-ui,sans-serif" font-weight="500"
						>{gmT}{gunit}</text>
					{/if}
				{/if}

				<!-- Gutter (first gap, only shown when not in overflow/illustrative mode) -->
				{#if showGutterAnn}
					{@const gx1 = smgL + colW}
					{@const gx2 = gx1 + effSgt}
					{@const gy  = smgT + iH * 0.14}
					<line x1={gx1} y1={gy - annTk} x2={gx1} y2={gy + annTk} stroke="color-mix(in srgb,var(--manual-brand) 52%,transparent)" stroke-width={annSW} />
					<line x1={gx2} y1={gy - annTk} x2={gx2} y2={gy + annTk} stroke="color-mix(in srgb,var(--manual-brand) 52%,transparent)" stroke-width={annSW} />
					<line x1={gx1} y1={gy} x2={gx2} y2={gy}
						stroke="color-mix(in srgb,var(--manual-brand) 52%,transparent)"
						stroke-width={annSW}
						stroke-dasharray="{annFS * 0.24} {annFS * 0.16}" />
					{#if effSgt * svgScale >= 26}
						<text x={(gx1 + gx2) / 2} y={gy - annTk - annFS * 0.18}
							text-anchor="middle"
							fill="color-mix(in srgb,var(--manual-brand) 82%,transparent)"
							font-size={annFS} font-family="system-ui,sans-serif" font-weight="600"
						>{ggutter}{gunit}</text>
					{/if}
				{/if}

				<!-- Outer border -->
				<rect width={SW} height={SH} rx="2" fill="none" stroke="var(--manual-border)" stroke-width={annSW * 1.5} />
			</svg>

			<dl class="grid-meta">
				<div><dt>{t.columns}</dt><dd>{gcols}</dd></div>
				{#if grows > 0}<div><dt>{t.rows}</dt><dd>{grows}</dd></div>{/if}
				<div><dt>{t.gutter}</dt><dd>{ggutter} {gunit}</dd></div>
				{#if grows > 0 && ggutterR !== ggutter}<div><dt>{t.gutterRows}</dt><dd>{ggutterR} {gunit}</dd></div>{/if}
				<div><dt>{t.margins}</dt><dd>{marginLabel}</dd></div>
				{#if gmedium !== 'print'}<div><dt>{t.maxWidth}</dt><dd>{block.config.maxWidth ?? 1280} {gunit}</dd></div>{/if}
				{#if gmedium === 'print'}<div><dt>{t.format}</dt><dd>{gformat} {gorient === 'portrait' ? '↕' : '↔'}</dd></div>{/if}
				{#if gbaseline > 0}<div><dt>Baseline</dt><dd>{gbaseline} {gunit}</dd></div>{/if}
				<div><dt>{t.medium}</dt><dd>{gmedium === 'print' ? t.print : gmedium === 'web' ? 'Web' : gmedium === 'social' ? 'Social' : gmedium}</dd></div>
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
				{#each block.config.items as item, i (i)}
					<div class="do-dont-item" class:is-do={item.type === 'do'} class:is-dont={item.type === 'dont'} class:has-image={!!item.imageUrl}>
						{#if item.imageUrl}
							<figure class="dd-media" style={item.imageBg ? `background:${item.imageBg}` : ''}>
								<img src={assetSrc(item.imageUrl)} alt={item.text ?? ''} loading="lazy" decoding="async" />
								{#if item.type === 'dont'}<span class="dd-strike" aria-hidden="true"></span>{/if}
							</figure>
						{/if}
						<div class="dd-body">
							<span class="do-dont-badge">
								{#if item.type === 'do'}<IconCheck size={12} stroke={2.5} />{t.do}{:else}<IconX size={12} stroke={2.5} />{t.dont}{/if}
							</span>
							{#if item.text}<p>{item.text}</p>{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'process'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.steps)}
			<ol class="process-list">
				{#each block.config.steps as step, i (i)}
					<li class="process-step">
						<div class="step-num">{String(i + 1).padStart(2, '0')}</div>
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
				{#each block.config.cards as card, i (i)}
					<div class="info-card">
						{#if card.imageUrl}
							<div class="card-img-wrap">
								<img src={assetSrc(card.imageUrl)} alt={card.title} loading="lazy" decoding="async" />
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
			{@const cx = 220}
			{@const cy = 190}
			{@const r  = 130}
			<div class="chart-wrap">
				<svg class="radar-chart" viewBox="0 0 440 380" aria-label={String(block.config.datasetLabel ?? 'Brand chart')}>
					<!-- grid rings -->
					{#each [0.25,0.5,0.75,1] as ring (ring)}
						<polygon class="radar-grid"
							points={Array.from({length:count},(_,i)=>{
								const angle = (i/count)*Math.PI*2 - Math.PI/2;
								return `${cx+Math.cos(angle)*r*ring},${cy+Math.sin(angle)*r*ring}`;
							}).join(' ')}
						/>
					{/each}
					<!-- axes -->
					{#each entries as _,i (i)}
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
					{#each entries as {label},i (`${label}-${i}`)}
						{@const angle=(i/count)*Math.PI*2-Math.PI/2}
						{@const lx=cx+Math.cos(angle)*(r+26)}
						{@const ly=cy+Math.sin(angle)*(r+26)}
						<text class="radar-label" x={lx} y={ly}
							text-anchor={lx<cx-8?'end':lx>cx+8?'start':'middle'}
							dominant-baseline={ly<cy-8?'auto':ly>cy+8?'hanging':'middle'}
						>{label}</text>
					{/each}
				</svg>
				<div class="chart-legend">
					{#each entries as {label,value}, i (`${label}-${i}`)}
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
				{#each block.config.items as item, i (i)}
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
					<thead><tr>{#each block.config.headers as h, i (i)}<th>{h}</th>{/each}</tr></thead>
					<tbody>
						{#if Array.isArray(block.config.rows)}
							{#each block.config.rows as row, rowIndex (rowIndex)}
								<tr>{#each row as cell, cellIndex (cellIndex)}<td>{cell}</td>{/each}</tr>
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
				<iframe class="html-preview" title={t.htmlPreview} sandbox="" srcdoc={sandboxedHtmlPreview(block.config.html)}></iframe>
			{/if}
			<pre class="code-block"><code>{block.config.html}</code></pre>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'code'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="code-shell">
			<div class="code-head">
				<span class="code-lang">{cfgStr('language') || 'code'}</span>
				<button class="code-copy" onclick={() => copyValue(`code-${block.id}`, String(block.config.code ?? ''))}>
					{#if copiedKey === `code-${block.id}`}<IconCheck size={14} stroke={2.4} />{t.copied}{:else}<IconCopy size={14} stroke={1.9} />{t.copy}{/if}
				</button>
			</div>
			<pre class="code-block"><code>{block.config.code ?? ''}</code></pre>
		</div>
	</ManualBlockShell>

{:else if block.type === 'typo_rules'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if Array.isArray(block.config.languages) && block.config.languages.length}
			{@const langs = block.config.languages as Array<{ lang: string; label: string; rules: Array<{ category: string; rule: string; correct?: string; wrong?: string }> }>}
			<!-- language tabs -->
			{#if langs.length > 1}
				<div class="tr-tabs" role="tablist">
					{#each langs as tl, i (tl.lang)}
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
							<th style="width:140px">{t.category}</th>
							<th>{t.rule}</th>
							<th style="width:160px">✓ {t.correct}</th>
							<th style="width:160px">✗ {t.wrong}</th>
						</tr></thead>
						<tbody>
							{#each activeLang.rules as rule, i (`${rule.category}-${i}`)}
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
				<div class="muted-block"><span class="placeholder-copy">{t.noRules}</span></div>
			{/if}
		{:else}
			<div class="muted-block"><span class="placeholder-copy">{t.addRules}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'image_gallery' || block.type === 'carousel'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const galleryAssets = assetsForBlock(block.config, true, true)}
		{#if galleryAssets.length}
			{@const lbImages = galleryAssets.map((asset) => ({ src: assetSrc(asset.storagePath), alt: asset.filename.replace(/\.[^.]+$/, ''), caption: block.config.showCaptions === false ? undefined : asset.filename, download: assetDownload(asset) }))}
			<div class="gallery-shell" class:is-carousel={block.type === 'carousel'}>
				{#if block.type === 'carousel'}
					<div class="carousel-controls">
						<button class="carousel-btn" onclick={() => scrollCarousel(-1)} disabled={carouselAtStart} aria-label={t.previous}><IconChevronLeft size={18} stroke={1.9} /></button>
						<button class="carousel-btn" onclick={() => scrollCarousel(1)} disabled={carouselAtEnd} aria-label={t.next}><IconChevronRight size={18} stroke={1.9} /></button>
					</div>
				{/if}
				<ul
					class:carousel={block.type === 'carousel'}
					class="image-gallery"
					style="--gallery-cols:{Math.min(6, Math.max(1, Number(block.config.columns ?? 3)))}"
					bind:this={carouselEl}
					onscroll={block.type === 'carousel' ? updateCarouselEdges : undefined}
				>
					{#each galleryAssets as asset, ai (asset.id)}
						<li class="gallery-card">
							<button class="gallery-btn" class:graphic={!isPhoto(asset)} onclick={() => openLightbox(lbImages, ai)} aria-label="{t.openImage}: {asset.filename}">
								<img src={assetPreview(asset)} alt={asset.filename.replace(/\.[^.]+$/, '')} loading="lazy" decoding="async" />
							</button>
							{#if block.config.showCaptions !== false}
								<span class="gallery-caption">
									<span class="gallery-caption-name">{asset.filename.replace(/\.[^.]+$/, '')}</span>
									<span class="gallery-caption-ext">{assetExt(asset)}</span>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">{t.noImages}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'icons'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const iconAssets = assetsForBlock(block.config, true, true)}
		{#if block.config.description}<p class="block-text">{block.config.description}</p>{/if}
		{#if iconAssets.length}
			<div class="icon-gallery" style="--icon-size:{Math.min(128, Math.max(16, Number(block.config.size ?? 32)))}px">
				{#each iconAssets as asset (asset.id)}
					<a class="icon-card" href={assetDownload(asset)} download={asset.filename}>
						<img src={assetPreview(asset)} alt="" loading="lazy" decoding="async" />
						<span>{asset.filename.replace(/\.[^.]+$/, '')}</span>
					</a>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">{t.noIcons}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'asset_gallery'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const galleryAssets = assetsForBlock(block.config)}
		{#if galleryAssets.length}
			<div class="asset-gallery" class:list={block.config.layout === 'list'}>
				{#each galleryAssets as asset (asset.id)}
					<a class="asset-public-card" href={assetDownload(asset)} download={asset.filename}>
						<div class="asset-public-preview" class:graphic={!isPhoto(asset)}>
							{#if assetPreview(asset)}<img src={assetPreview(asset)} alt="" loading="lazy" decoding="async" />{:else}<span>{asset.filename.split('.').pop()?.toUpperCase()}</span>{/if}
						</div>
						<div><strong>{asset.filename}</strong><span>{formatBytes(asset.size)}</span></div>
						<IconDownload size={16} stroke={1.8} />
					</a>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">{t.noAssets}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'download'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{@const downloadAssets = assetsForBlock(block.config)}
		{#if block.config.description}<p class="block-text download-description">{block.config.description}</p>{/if}
		{#if downloadAssets.length}
			<div class="download-list">
				{#each downloadAssets as asset (asset.id)}
					<a class="download-row" href={assetDownload(asset)} download={asset.filename}>
						<span><strong>{asset.filename}</strong><small>{asset.mime} · {formatBytes(asset.size)}</small></span>
						<IconDownload size={17} stroke={1.8} />
					</a>
				{/each}
			</div>
		{:else}
			<div class="muted-block"><span class="placeholder-copy">{t.noFiles}</span></div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'font_usage'}
	{@const usageRows = list<{ label: string; fontIds?: string[] }>('rows').filter(r => r?.label)}
	{@const usageFonts = (() => { const ids = new Set(usageRows.flatMap(r => r.fontIds ?? [])); return fontRows.filter(f => ids.has(f.id)); })()}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if usageRows.length && usageFonts.length}
			<div class="table-wrap">
				<table class="block-table usage-table">
					<thead><tr>
						<th>{t.usage}</th>
						{#each usageFonts as f (f.id)}<th class="usage-font" style="font-family:'{f.name.replace(/'/g, '')}', var(--manual-font)">{f.name}</th>{/each}
					</tr></thead>
					<tbody>
						{#each usageRows as row, ri (ri)}
							<tr>
								<td>{row.label}</td>
								{#each usageFonts as f (f.id)}
									<td class="usage-cell">
										{#if row.fontIds?.includes(f.id)}<span class="usage-yes" aria-label="✓"><IconCheck size={15} stroke={2.6} /></span>{:else}<span class="usage-no" aria-label="—">—</span>{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'logo_download'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<LogoDownload blockId={block.id} config={block.config} />
	</ManualBlockShell>

{:else if block.type === 'color_ratio'}
	{@const ratioItems = list<{ colorId?: string; hex?: string; label?: string; percent: number }>('items')
		.map((item) => {
			const color = colorRows.find((c) => c.id === item.colorId);
			const hex = color?.hex ?? (typeof item.hex === 'string' && /^#[0-9a-f]{6}$/i.test(item.hex) ? item.hex : null);
			return hex ? { hex, label: item.label || color?.name || hex.toUpperCase(), percent: Math.max(0, Number(item.percent) || 0) } : null;
		})
		.filter((item): item is { hex: string; label: string; percent: number } => !!item && item.percent > 0)}
	{@const ratioTotal = ratioItems.reduce((sum, item) => sum + item.percent, 0) || 1}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if ratioItems.length}
			<div class="ratio-block">
				<div class="ratio-bar" role="img" aria-label={ratioItems.map((i) => `${i.label} ${Math.round(i.percent / ratioTotal * 100)} %`).join(', ')}>
					{#each ratioItems as item, ri (ri)}
						<span style="flex:{item.percent} 1 0; background:{item.hex}; color:{contrastOnColor(item.hex)}">
							{#if item.percent / ratioTotal >= 0.08}<em>{Math.round(item.percent / ratioTotal * 100)} %</em>{/if}
						</span>
					{/each}
				</div>
				<ul class="ratio-legend">
					{#each ratioItems as item, ri (ri)}
						<li><span class="ratio-dot" style="background:{item.hex}"></span>{item.label}<strong>{Math.round(item.percent / ratioTotal * 100)} %</strong></li>
					{/each}
				</ul>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'contrast_checker'}
	{@const fg = /^#[0-9a-f]{6}$/i.test(contrastFg) ? contrastFg : '#171717'}
	{@const bg = /^#[0-9a-f]{6}$/i.test(contrastBg) ? contrastBg : '#ffffff'}
	{@const ratio = wcagContrast(fg, bg)}
	{@const paletteForChecker = colorRows.length ? colorRows : []}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="cc-block">
			<div class="cc-preview" style="background:{bg}; color:{fg}">
				<span class="cc-big">Aa</span>
				<span class="cc-sample">{cfgStr('sample') || 'The quick brown fox jumps over the lazy dog'}</span>
			</div>
			<div class="cc-controls">
				{#each [['fg', t.textColor], ['bg', t.backgroundColor]] as [which, label] (which)}
					<div class="cc-field">
						<span class="cc-label">{label}</span>
						<div class="cc-input">
							<input type="color" value={which === 'fg' ? fg : bg} oninput={(e) => { const v = (e.target as HTMLInputElement).value; if (which === 'fg') contrastFg = v; else contrastBg = v; }} aria-label={label} />
							<input type="text" value={(which === 'fg' ? fg : bg).toUpperCase()} maxlength="7" spellcheck="false"
								oninput={(e) => { let v = (e.target as HTMLInputElement).value.trim(); if (!v.startsWith('#')) v = `#${v}`; if (which === 'fg') contrastFg = v; else contrastBg = v; }} aria-label="{label} HEX" />
						</div>
						{#if paletteForChecker.length}
							<div class="cc-swatches">
								{#each paletteForChecker as c (c.id)}
									<button class="cc-swatch" class:active={(which === 'fg' ? fg : bg).toLowerCase() === c.hex.toLowerCase()} style="background:{c.hex}" title={c.name} aria-label="{label}: {c.name}"
										onclick={() => { if (which === 'fg') contrastFg = c.hex; else contrastBg = c.hex; }}></button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
				<button class="cc-swap" onclick={() => { const tmp = contrastFg; contrastFg = contrastBg; contrastBg = tmp; }} aria-label={t.swapColors}><IconArrowsHorizontal size={16} stroke={1.9} /> {t.swapColors}</button>
			</div>
			<div class="cc-results">
				<div class="cc-ratio"><span>{t.contrastRatio}</span><strong>{ratio}:1</strong></div>
				{#each [[t.smallText, 4.5, 7], [t.largeText, 3, 4.5], [t.uiComponents, 3, null]] as [label, aa, aaa] (label)}
					{@const level = aaa !== null && ratio >= Number(aaa) ? 'AAA' : ratio >= Number(aa) ? 'AA' : null}
					<div class="cc-row" class:fail={!level}>
						<span>{label}</span>
						<em>{level ?? t.fail}</em>
					</div>
				{/each}
			</div>
		</div>
	</ManualBlockShell>

{:else if block.type === 'hotspots'}
	{@const spots = list<{ x: number; y: number; title?: string; text?: string }>('points').filter((p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y)))}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if cfgStr('imageUrl')}
			<figure class="hs-figure">
				<div class="hs-stage">
					<img src={assetSrc(cfgStr('imageUrl'))} alt={cfgStr('alt')} loading="lazy" decoding="async" />
					{#each spots as spot, si (si)}
						<button
							class="hs-dot"
							class:active={activeHotspot === si}
							style="left:{Math.min(100, Math.max(0, Number(spot.x)))}%; top:{Math.min(100, Math.max(0, Number(spot.y)))}%"
							onclick={() => (activeHotspot = activeHotspot === si ? null : si)}
							onmouseenter={() => (activeHotspot = si)}
							aria-expanded={activeHotspot === si}
							aria-label={spot.title || `${si + 1}`}
						>{si + 1}</button>
						{#if activeHotspot === si && (spot.title || spot.text)}
							<div class="hs-tip" class:left={Number(spot.x) > 60} style="left:{Number(spot.x)}%; top:{Number(spot.y)}%" role="tooltip">
								{#if spot.title}<strong>{spot.title}</strong>{/if}
								{#if spot.text}<span>{spot.text}</span>{/if}
							</div>
						{/if}
					{/each}
				</div>
				{#if block.config.showList !== false && spots.some((s) => s.title || s.text)}
					<ol class="hs-list">
						{#each spots as spot, si (si)}
							<li class:active={activeHotspot === si}>
								<button onclick={() => (activeHotspot = si)}>
									<span class="hs-num">{si + 1}</span>
									<span>{#if spot.title}<strong>{spot.title}</strong>{/if}{#if spot.text}<small>{spot.text}</small>{/if}</span>
								</button>
							</li>
						{/each}
					</ol>
				{/if}
			</figure>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'quote'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if cfgStr('quote').trim()}
			<figure class="quote-block" class:large={cfgStr('size') !== 'normal'}>
				<span class="quote-mark" aria-hidden="true"><IconQuote size={30} stroke={1.5} /></span>
				<blockquote>{cfgStr('quote')}</blockquote>
				{#if cfgStr('author') || cfgStr('role')}
					<figcaption>
						{#if cfgStr('author')}<strong>{cfgStr('author')}</strong>{/if}
						{#if cfgStr('role')}<span>{cfgStr('role')}</span>{/if}
					</figcaption>
				{/if}
			</figure>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'callout'}
	{@const tone = ['info', 'success', 'warning', 'danger'].includes(cfgStr('tone')) ? cfgStr('tone') : 'info'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if cfgStr('title') || cfgStr('text')}
			<div class="callout-block tone-{tone}" role="note">
				<span class="callout-block-icon" aria-hidden="true">
					{#if tone === 'success'}<IconCircleCheck size={20} stroke={1.9} />
					{:else if tone === 'warning'}<IconAlertTriangle size={20} stroke={1.9} />
					{:else if tone === 'danger'}<IconCancel size={20} stroke={1.9} />
					{:else}<IconInfoCircle size={20} stroke={1.9} />{/if}
				</span>
				<div class="callout-block-body">
					{#if cfgStr('title')}<strong>{cfgStr('title')}</strong>{/if}
					{#if cfgStr('text')}<p>{cfgStr('text')}</p>{/if}
				</div>
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'stats'}
	{@const stats = list<{ value: string; label: string; description?: string }>('items').filter((item) => item?.value || item?.label)}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if stats.length}
			<div class="stats-grid" style="--stat-cols:{Math.min(4, stats.length)}">
				{#each stats as stat, si (si)}
					<div class="stat">
						<span class="stat-value">{stat.value}</span>
						<span class="stat-label">{stat.label}</span>
						{#if stat.description}<span class="stat-desc">{stat.description}</span>{/if}
					</div>
				{/each}
			</div>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'embed'}
	{@const embed = resolveEmbed(block.config.url)}
	{@const ratio = ['16/9', '4/3', '1/1', '9/16', '21/9'].includes(cfgStr('ratio')) ? cfgStr('ratio') : '16/9'}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if embed.kind === 'iframe'}
			<figure class="embed-figure">
				<div class="embed-frame" style="aspect-ratio:{ratio}">
					<iframe
						src={embed.src}
						title={cfgStr('title') || embed.provider}
						loading="lazy"
						allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
						allowfullscreen
						referrerpolicy="strict-origin-when-cross-origin"
					></iframe>
				</div>
				{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
			</figure>
		{:else if embed.kind === 'audio'}
			<figure class="embed-figure">
				<audio src={embed.src} controls preload="metadata" class="embed-audio"></audio>
				{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
			</figure>
		{:else if embed.kind === 'video'}
			<figure class="embed-figure">
				<div class="embed-frame" style="aspect-ratio:{ratio}">
					<video
						src={embed.src}
						controls={block.config.controls !== false}
						autoplay={block.config.autoplay === true}
						muted={block.config.autoplay === true}
						loop={block.config.loop === true}
						playsinline
						preload="metadata"
						poster={block.config.poster ? assetSrc(block.config.poster) : undefined}
					></video>
				</div>
				{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
			</figure>
		{:else if cfgStr('url')}
			<a class="link-card" href={linkHref(cfgStr('url'))} target="_blank" rel="noopener noreferrer">
				<span class="link-card-icon"><IconPlayerPlay size={18} stroke={1.8} /></span>
				<span class="link-card-body"><strong>{cfgStr('title') || t.videoFallback}</strong><small>{hostOf(linkHref(cfgStr('url'))) || cfgStr('url')}</small></span>
				<span class="link-card-arrow"><IconArrowUpRight size={16} stroke={1.8} /></span>
			</a>
		{/if}
	</ManualBlockShell>

{:else if block.type === 'text_image'}
	{@const img = cfgStr('imageUrl')}
	{@const body = richContent(block.config)}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="text-image" class:image-left={cfgStr('imagePosition') === 'left'} class:no-image={!img}>
			<div class="text-image-copy">
				{#if cfgStr('title')}<h3>{cfgStr('title')}</h3>{/if}
				{#each body as item, itemIndex (itemIndex)}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
					<div class="prose">{@html item.html}</div>
				{/each}
				{#if cfgStr('ctaLabel') && cfgStr('ctaUrl')}
					{@const href = linkHref(cfgStr('ctaUrl'))}
					<a class="text-image-cta" {href} target={isExternal(href) ? '_blank' : undefined} rel={isExternal(href) ? 'noopener noreferrer' : undefined}>
						{cfgStr('ctaLabel')} <IconArrowUpRight size={15} stroke={2} />
					</a>
				{/if}
			</div>
			{#if img}
				<figure class="text-image-media" style={cfgStr('imageBg') ? `background:${cfgStr('imageBg')}` : ''}>
					<img src={assetSrc(img)} alt={cfgStr('alt')} loading="lazy" decoding="async" class:contain={cfgStr('fit') === 'contain'} />
				</figure>
			{/if}
		</div>
	</ManualBlockShell>

{:else if block.type === 'links'}
	{@const links = list<{ title: string; url: string; description?: string }>('items').filter((item) => item?.url)}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		{#if links.length}
			<ul class="links-grid">
				{#each links as link, li (li)}
					{@const href = linkHref(link.url)}
					{@const external = isExternal(href)}
					<li>
						<a class="link-card" {href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
							<span class="link-card-body">
								<strong>{link.title || hostOf(href) || link.url}</strong>
								<small>{link.description || hostOf(href) || link.url}</small>
							</span>
							<span class="link-card-arrow"><IconArrowUpRight size={16} stroke={1.5} /></span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</ManualBlockShell>

{:else}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config}>
		<div class="muted-block">
			<span class="block-type-label">{block.type}</span>
		</div>
	</ManualBlockShell>
{/if}

<Lightbox images={lightboxImages} bind:index={lightboxIndex} />

<style>
	/* ── Shared ──────────────────────────────────────────────────────────────── */
	.block-text { color: var(--manual-muted); line-height: 1.72; font-size: var(--text-md); }
	.block-text + .icon-gallery { margin-top: 1rem; }
	/* ── Gallery / carousel ─────────────────────────────────────────────────── */
	.gallery-shell { position: relative; display: flex; flex-direction: column; gap: .75rem; }
	.image-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, max(160px, calc((100% - (var(--gallery-cols) - 1) * 1rem) / var(--gallery-cols)))), 1fr));
		gap: 1rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.image-gallery.carousel {
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding: 0;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
	}
	.image-gallery.carousel::-webkit-scrollbar { display: none; }
	.image-gallery.carousel .gallery-card { flex: 0 0 min(72%, 440px); scroll-snap-align: start; }
	.image-gallery.carousel .gallery-btn img { aspect-ratio: 3/2; }
	.carousel-controls { display: flex; gap: .4rem; justify-content: flex-end; order: 2; }
	.carousel-btn {
		display: grid; place-items: center; width: 36px; height: 36px;
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: transparent; color: var(--manual-ink); cursor: pointer;
		transition: background .15s ease, opacity .15s ease, border-color .15s ease;
	}
	.carousel-btn:hover:not(:disabled) { border-color: var(--manual-border-strong); background: var(--manual-hover); }
	.carousel-btn:disabled { opacity: .35; cursor: default; }
	.gallery-card { display: flex; flex-direction: column; gap: .5rem; min-width: 0; margin: 0; }
	.gallery-btn, .zoom-btn {
		display: block; width: 100%; padding: 0; border: 0; background: none;
		cursor: zoom-in; border-radius: var(--manual-radius); overflow: hidden;
	}
	.gallery-btn {
		position: relative;
		background: var(--manual-stage);
	}
	.gallery-btn img {
		display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover;
		transition: transform .6s var(--manual-ease, ease);
	}
	.gallery-btn:not(.graphic):hover img { transform: scale(1.025); }
	/* Graphics sit whole on a quiet transparency grid, like an artboard */
	.gallery-btn.graphic, .asset-public-preview.graphic {
		--chk: color-mix(in srgb, var(--manual-ink) 3.5%, transparent);
		background-color: var(--manual-stage);
		background-image:
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%),
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%);
		background-size: 16px 16px;
		background-position: 0 0, 8px 8px;
	}
	.gallery-btn.graphic img { object-fit: contain; padding: 14%; }
	.gallery-caption { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; min-width: 0; color: var(--manual-muted); font-size: var(--text-xs); }
	.gallery-caption-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--manual-ink); }
	.gallery-caption-ext { flex: 0 0 auto; font-family: var(--manual-mono); font-size: var(--text-2xs); letter-spacing: .04em; }
	.icon-gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap:1.25rem .75rem; }
	.icon-card { display:flex; min-width:0; flex-direction:column; align-items:stretch; gap:.6rem; color:var(--manual-ink); text-decoration:none; }
	.icon-card img { box-sizing:content-box; padding:calc((88px - var(--icon-size)) / 2) 0; width:100%; background:var(--manual-stage); border-radius:var(--manual-radius); transition:background .2s ease; }
	.icon-card:hover img { background:color-mix(in srgb, var(--manual-ink) 6%, var(--manual-paper)); }
	.icon-card img { height:var(--icon-size); object-fit:contain; }
	.icon-card span { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--manual-muted); font-size: var(--text-xs); }
		/* Files read as a typeset list: hairline rows, no boxes */
	.asset-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); column-gap:2rem; border-top:1px solid var(--manual-border); }
	.asset-gallery.list { grid-template-columns:1fr; }
	.asset-public-card, .download-row { display:flex; align-items:center; gap:.9rem; min-width:0; padding:.8rem 0; border-bottom:1px solid var(--manual-border); color:var(--manual-ink); text-decoration:none; transition:color .15s ease; }
	.asset-public-card :global(svg), .download-row :global(svg) { color:var(--manual-muted); transition:color .15s ease, transform .2s var(--manual-ease); }
	.asset-public-card:hover :global(svg), .download-row:hover :global(svg) { color:var(--manual-ink); transform:translateY(1px); }
	.asset-public-preview { display:flex; align-items:center; justify-content:center; width:48px; height:40px; flex:0 0 auto; overflow:hidden; border-radius:calc(var(--manual-radius) * .6); background:var(--manual-stage); color:var(--manual-muted); font-size: var(--text-2xs); font-weight: 500; }
	.asset-public-preview img { width:100%; height:100%; object-fit:cover; }
	.asset-public-preview.graphic img { object-fit:contain; padding:6px; }
	.asset-public-card > div:nth-child(2), .download-row > span { display:flex; flex:1; min-width:0; flex-direction:column; gap:.2rem; }
	.asset-public-card strong, .download-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size: var(--text-md); font-weight: 500; }
	.asset-public-card span, .download-row small { color:var(--manual-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
	.download-list { display:flex; flex-direction:column; border-top:1px solid var(--manual-border); }
	.download-description { margin:0 0 .8rem; }

	.divider { position: relative; margin: calc(var(--divider-space) / 4) 0; height: 1px; }
	.divider-line { background: var(--manual-border); }
	.divider-dots { height: 6px; background: radial-gradient(circle, var(--manual-border-strong) 1.5px, transparent 2px) center / 16px 6px repeat-x; max-width: 120px; margin-inline: auto; }

	.muted-block {
		display: flex; flex-direction: column; gap: 6px;
		padding: 1.35rem;
		border: 1px dashed color-mix(in srgb, var(--manual-ink) 16%, transparent);
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-surface) 62%, transparent);
		color: var(--manual-muted);
	}
	.placeholder-copy { font-size: var(--text-base); line-height: 1.55; }
	.block-type-label {
		display: block; margin-bottom: .4rem; color: var(--manual-muted);
		font-size: var(--manual-label-size); text-transform: uppercase; letter-spacing: var(--manual-label-tracking); font-weight: 500;
	}

	/* ── Rich text ───────────────────────────────────────────────────────────── */
	.prose { max-width: 72ch; color: var(--manual-ink); line-height: 1.75; font-size: var(--text-lg); text-wrap: pretty; }
	.prose :global(h2), .prose :global(h3), .prose :global(h4) { margin: 1.6em 0 .5em; line-height: 1.25; letter-spacing: -.015em; font-weight: 500; }
	.prose :global(h2:first-child), .prose :global(h3:first-child), .prose :global(h4:first-child) { margin-top: 0; }
	.prose :global(a) { color: inherit; text-decoration-color: color-mix(in srgb, var(--manual-brand) 55%, transparent); text-decoration-thickness: 1px; text-underline-offset: 3px; transition: text-decoration-color .15s ease; }
	.prose :global(a:hover) { text-decoration-color: var(--manual-brand); }
	.prose :global(strong) { font-weight: 600; }
	.prose :global(blockquote) { margin: 1rem 0; padding-left: 1rem; border-left: 1px solid var(--manual-border-strong); color: var(--manual-muted); }
	.prose :global(li::marker) { color: var(--manual-muted); }
	.prose :global(code) { padding: .12em .35em; border-radius: var(--radius-sm); background: color-mix(in srgb, var(--manual-ink) 7%, transparent); font-family: var(--manual-mono, monospace); font-size: .88em; }
	.prose :global(p) { margin: 0 0 .9rem; }
	.prose :global(p:last-child), .prose :global(ul:last-child), .prose :global(ol:last-child) { margin-bottom: 0; }
	.prose :global(ul), .prose :global(ol) { margin: .4rem 0 .9rem 1.25rem; padding: 0; }
	.rich-flow { display: flex; flex-direction: column; gap: 1rem; }
	/* Same note language as the section context: a hairline in the state
	   colour, never a tinted box */
	.content-callout {
		display: grid; grid-template-columns: 16px minmax(0,1fr); gap: .65rem;
		--tone: var(--manual-warning);
		max-width: 72ch;
		padding: .1rem 0 .1rem .9rem;
		border-left: 1px solid var(--tone);
		color: var(--manual-ink);
	}
	.content-callout.alert { --tone: var(--manual-danger); }
	.content-callout-icon { width: 16px; height: 1.65em; display: grid; place-items: center; color: var(--tone); }
	.content-callout-icon :global(svg) { width: 15px; height: 15px; }
	.content-callout-body { font-size: var(--text-md); line-height: 1.65; }
	.content-callout-body :global(p) { margin: 0 0 .65rem; }
	.content-callout-body :global(p:last-child) { margin-bottom: 0; }

	/* ── Image ───────────────────────────────────────────────────────────────── */
	.img-figure { margin: 0; }
	.img-figure.full-width { width: 100%; }
	.img-figure.full-width .block-img { margin: 0 auto; }
	.img-figure.full-width .img-caption { text-align: center; }
	.block-img {
		display: block; max-width: 100%; height: auto;
		/* a portrait key visual must not run for two screens */
		max-height: min(85vh, 960px); width: auto;
	}
	.zoom-btn { width: auto; max-width: 100%; }
	.img-figure.full-width .zoom-btn { margin: 0 auto; }
	.img-figure.framed {
		/* defaults overridden by inline style from block config */
		background: #ffffff;
		border-radius: var(--manual-radius);
		padding: 1rem;
	}
	.img-caption { margin-top: .7rem; color: var(--manual-muted); font-size: var(--text-sm); line-height: 1.5; }

	/* ── Before / After ──────────────────────────────────────────────────────── */
	.ba-wrap { display: flex; flex-direction: column; gap: .5rem; }
	.ba-slider {
		position: relative; overflow: hidden; border-radius: var(--manual-radius);
		aspect-ratio: 16/9; user-select: none;
		background: var(--manual-stage);
	}
	.ba-before, .ba-after {
		position: absolute; inset: 0;
	}
	.ba-before { clip-path: inset(0 calc(100% - var(--split)) 0 0); }
	.ba-after  { clip-path: inset(0 0 0 var(--split)); }
	.ba-before img, .ba-after img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.ba-divider {
		position: absolute; top: 0; bottom: 0; width: 1px;
		background: #fff; transform: translateX(-50%); pointer-events: none;
	}
	.ba-handle {
		position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
		width: 40px; height: 40px; border-radius: 50%;
		background: #fff; color: #171717; box-shadow: 0 4px 14px rgba(0,0,0,.28);
		display: flex; align-items: center; justify-content: center;
	}
	.ba-label {
		position: absolute; bottom: 12px; padding: 3px 8px; border-radius: var(--radius-xs);
		background: rgba(0,0,0,.5); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
		color: #fff; font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase;
	}
	.ba-label-before { left: 10px; }
	.ba-label-after  { right: 10px; }
	.ba-range {
		position: absolute; inset: 0; z-index: 3;
		width: 100%; height: 100%; margin: 0;
		opacity: 0; cursor: ew-resize;
		-webkit-appearance: none; appearance: none;
		touch-action: pan-y;
	}
	.ba-slider:has(.ba-range:focus-visible) {
		outline: 2px solid var(--manual-brand); outline-offset: 3px;
	}

	/* ── Colors ──────────────────────────────────────────────────────────────── */
	/* The colour itself is the only surface; everything else is set type on
	   paper, like a printed specimen sheet. */
	.colors-wrap {
		display: flex;
		flex-direction: column;
		gap: clamp(2.5rem, 4vw, 3.5rem);
	}
	.palette-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.palette-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(120px, 28%);
		gap: 1rem;
		align-items: center;
		padding-bottom: .7rem;
		border-bottom: 1px solid var(--manual-border);
	}
	.palette-title-wrap {
		display: flex;
		align-items: baseline;
		gap: .6rem;
		min-width: 0;
	}
	.palette-name {
		margin: 0;
		color: var(--manual-ink);
		font-size: var(--text-md);
		font-weight: 500;
		letter-spacing: -.01em;
		line-height: 1.2;
	}
	.palette-count {
		color: var(--manual-muted);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.palette-strip {
		display: flex;
		min-width: 0;
		height: 4px;
		overflow: hidden;
		border-radius: 2px;
	}
	.palette-strip-swatch {
		flex: 1 1 0;
		min-width: 12px;
	}
	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 2rem 1.25rem;
		align-items: start;
	}
	.color-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	/* shade ramp sits directly under the swatch, specimen-style */
	.color-card > .color-swatch { order: 0; }
	.color-card > .shades-strip { order: 1; }
	.color-card > .color-details { order: 2; }
	.color-swatch {
		position: relative;
		display: flex;
		min-height: 148px;
		width: 100%;
		flex-direction: column;
		justify-content: flex-end;
		padding: .8rem .85rem;
		border: 0;
		border-radius: var(--manual-radius);
		/* keeps near-paper colours visible without a frame */
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 7%, transparent);
		text-align: left;
		cursor: pointer;
		transition: transform .25s var(--manual-ease);
	}
	.color-card:has(.shades-strip) .color-swatch { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
	.color-swatch:hover .copy-hint,
	.color-swatch:focus-visible .copy-hint {
		opacity: .8;
	}
	.color-swatch:focus-visible,
	.cv-row:focus-visible,
	.shade-btn:focus-visible {
		outline: 2px solid var(--manual-brand);
		outline-offset: 2px;
	}
	.swatch-copy-icon {
		position: absolute;
		top: .65rem;
		right: .65rem;
		z-index: 1;
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		border-radius: var(--manual-radius);
		opacity: 0;
		transition: opacity .16s ease;
	}
	.color-swatch:hover .swatch-copy-icon,
	.color-swatch:focus-visible .swatch-copy-icon { opacity: .75; }
	.swatch-bottom {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: .5rem;
	}
	.swatch-hex-val {
		font-family: var(--manual-mono);
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: .02em;
	}
	.copy-hint,
	.copied-flash {
		font-size: var(--text-2xs);
		font-weight: 500;
		opacity: 0;
	}
	.copy-hint { transition: opacity .16s ease; }
	.copied-flash { opacity: .85; }
	.color-details {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: .7rem;
		padding-top: .85rem;
	}
	.color-title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: .65rem;
	}
	.color-name {
		min-width: 0;
		color: var(--manual-ink);
		font-size: var(--text-md);
		font-weight: 500;
		letter-spacing: -.01em;
		line-height: 1.25;
	}
	.color-values {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--manual-border);
	}
	.cv-row {
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr) 16px;
		align-items: center;
		gap: .5rem;
		min-height: 30px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--manual-border);
		border-radius: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
		transition: color .12s ease;
	}
	.cv-label {
		color: var(--manual-muted);
		font-size: var(--manual-label-size);
		font-weight: 500;
		letter-spacing: var(--manual-label-tracking);
		text-transform: uppercase;
	}
	.cv-val {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-ink);
		font-size: var(--text-xs);
		font-variant-numeric: tabular-nums;
		line-height: 1.35;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mono { font-family: var(--manual-mono); }
	.cv-copy {
		display: grid;
		width: 16px;
		height: 16px;
		place-items: center;
		color: var(--manual-muted);
		opacity: 0;
		transition: opacity .12s ease;
	}
	.cv-row:hover .cv-copy,
	.cv-row:focus-visible .cv-copy { opacity: 1; }
	.production-detail {
		display: flex;
		flex-direction: column;
		gap: .3rem;
	}
	.production-label {
		color: var(--manual-muted);
		font-size: var(--manual-label-size);
		font-weight: 500;
		letter-spacing: var(--manual-label-tracking);
		text-transform: uppercase;
	}
	.production-list {
		display: flex;
		flex-direction: column;
		border-top: 1px solid var(--manual-border);
	}
	.production-row {
		display: grid;
		grid-template-columns: minmax(54px, .9fr) minmax(0, 1.35fr) 16px;
		align-items: center;
		gap: .5rem;
		min-height: 30px;
		padding: 0;
		border: 0;
		border-bottom: 1px solid var(--manual-border);
		border-radius: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.production-row:hover .cv-copy,
	.production-row:focus-visible .cv-copy { opacity: 1; }
	.production-ref-label {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-muted);
		font-size: var(--text-xs);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.production-ref-value {
		min-width: 0;
		overflow: hidden;
		color: var(--manual-ink);
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1.35;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	/* Contrast: quiet typeset result; only a failure is coloured */
	.contrast-detail {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: .5rem;
	}
	.contrast-pair {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr);
		gap: .5rem;
		align-items: center;
		min-width: 0;
	}
	.contrast-sample {
		display: grid;
		width: 24px;
		height: 24px;
		place-items: center;
		border-radius: calc(var(--manual-radius) * .6);
		font-size: var(--text-xs);
		font-weight: 600;
		line-height: 1;
	}
	.contrast-sample-white {
		box-shadow: inset 0 0 0 1px var(--manual-border);
		background: #fff;
	}
	.contrast-sample-black {
		background: #111;
	}
	.contrast-meta {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: baseline;
		column-gap: .35rem;
	}
	.contrast-bg {
		width: 100%;
		overflow: hidden;
		color: var(--manual-muted);
		font-size: var(--text-2xs);
		line-height: 1.2;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.contrast-meta strong {
		color: var(--manual-ink);
		font-size: var(--text-xs);
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		line-height: 1.3;
	}
	.contrast-meta em {
		color: var(--manual-muted);
		font-size: var(--text-2xs);
		font-style: normal;
		font-weight: 500;
		letter-spacing: .04em;
		line-height: 1.3;
	}
	.contrast-pair.fail .contrast-meta strong { color: var(--manual-danger); }
	.contrast-pair.fail .contrast-meta em { display: none; }
	.shades-strip {
		display: flex;
		min-height: 20px;
		overflow: hidden;
		border-radius: 0 0 var(--manual-radius) var(--manual-radius);
	}
	.shade-btn {
		position: relative;
		display: grid;
		flex: 1;
		min-width: 0;
		height: 20px;
		place-items: center;
		border: 0;
		cursor: pointer;
		transition: flex-grow .2s var(--manual-ease);
	}
	.shade-btn:hover { z-index: 1; flex-grow: 1.8; }
	.shade-btn::after {
		content: attr(data-label);
		position: absolute;
		top: calc(100% + 6px);
		left: 50%;
		z-index: 5;
		transform: translateX(-50%);
		padding: 2px 5px;
		border-radius: var(--radius-xs);
		background: var(--manual-ink);
		color: var(--manual-paper);
		font-family: var(--manual-mono);
		font-size: var(--text-2xs);
		opacity: 0;
		pointer-events: none;
		white-space: nowrap;
		transition: opacity .12s ease;
	}
	.shade-btn:hover::after,
	.shade-btn:focus-visible::after { opacity: 1; }
	.shade-flash {
		color: #fff;
		font-size: var(--text-2xs);
		font-weight: 500;
		mix-blend-mode: difference;
	}

	/* ── Typography ──────────────────────────────────────────────────────────── */
	.typo-fonts { display: flex; flex-direction: column; gap: 2.5rem; }
	.typo-font { display: flex; flex-direction: column; gap: 2.5rem; }
	/* Tables are typeset, not boxed: a stronger rule under the head, hairlines
	   between rows, no fills. Shared by every tabular block. */
	.style-table-wrap { overflow-x: auto; }
	.style-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
	.style-table th { padding: 0 1rem .6rem 0; text-align: left; font-size: var(--manual-label-size); font-weight: 500; color: var(--manual-muted); text-transform: uppercase; letter-spacing: var(--manual-label-tracking); border-bottom: 1px solid var(--manual-border-strong); white-space: nowrap; }
	.style-table td { padding: .85rem 1rem .85rem 0; border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); vertical-align: middle; }
	.style-table td:not(:first-child) { color: var(--manual-muted); }

	/* ── Logo spec ───────────────────────────────────────────────────────────── */
	.logo-spec { display: flex; flex-direction: column; gap: 1.25rem; }
	.logo-preview-wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; }
	/* Artboards: flat light and dark stages; the clear space is drawn as a
	   hairline with a quiet caption, like a construction drawing. */
	.logo-stage {
		display: grid; place-items: center;
		min-height: 280px; padding: clamp(2rem, 6%, 3.5rem);
		border-radius: var(--manual-radius);
		background: #fff;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent);
	}
	.logo-stage-dark {
		background: #111;
		box-shadow: none;
	}
	.logo-zone {
		position: relative;
		padding: calc(var(--cz) * 2.25rem);
		outline: 1px dashed color-mix(in srgb, var(--manual-brand) 60%, transparent);
		background: color-mix(in srgb, var(--manual-brand) 4%, #fff);
	}
	.logo-stage-dark .logo-zone { background: color-mix(in srgb, #fff 3%, #111); outline-color: rgba(255,255,255,.35); }
	.logo-zone-label {
		position: absolute; left: 0; top: calc(100% + 8px);
		color: #6b6b6b;
		font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; white-space: nowrap;
	}
	.logo-stage-dark .logo-zone-label { color: rgba(255,255,255,.55); }
	.logo-preview-img { max-width: 100%; max-height: 96px; display: block; }
	.logo-preview-img.auto-invert { filter: invert(1) brightness(2); }
	.logo-specs { display: flex; flex-wrap: wrap; gap: .75rem 2.5rem; margin: 0; padding-top: .9rem; border-top: 1px solid var(--manual-border); }
	.logo-specs div { display: flex; flex-direction: column; gap: 4px; }
	.logo-specs dt { font-size: var(--manual-label-size); color: var(--manual-muted); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; }
	.logo-specs dd { margin: 0; font-size: var(--text-md); font-weight: 500; color: var(--manual-ink); font-variant-numeric: tabular-nums; }

	/* ── Text styles ─────────────────────────────────────────────────────────── */
	.text-styles { display: flex; flex-direction: column; }
	.ts-row {
		display: flex; align-items: baseline; gap: 1rem;
		padding: .85rem 0; border-bottom: 1px solid var(--manual-border);
	}
	.ts-row:last-child { border-bottom: none; }
	.ts-preview { min-width: 0; flex: 1; color: var(--manual-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ts-meta { display: flex; gap: .7rem; flex-shrink: 0; color: var(--manual-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
	.ts-font { color: var(--manual-ink); }

	/* ── Cards ───────────────────────────────────────────────────────────────── */
	/* Cards without card chrome: image, then text set on the paper */
	.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 2rem 1.25rem; }
	.info-card { display: flex; flex-direction: column; gap: .9rem; }
	.info-card:not(:has(.card-img-wrap)) { padding-top: .9rem; border-top: 1px solid var(--manual-border); }
	.card-img-wrap { aspect-ratio: 4/3; overflow: hidden; border-radius: var(--manual-radius); background: var(--manual-stage); }
	.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.card-body { display: flex; flex-direction: column; gap: 6px; }
	.card-title { font-size: var(--text-md); font-weight: 500; letter-spacing: -.01em; color: var(--manual-ink); display: block; }
	.card-desc { margin: 0; font-size: var(--text-sm); color: var(--manual-muted); line-height: 1.55; }

	/* ── Chart ───────────────────────────────────────────────────────────────── */
	.chart-wrap { display: grid; grid-template-columns: 380px minmax(0,1fr); gap: 2rem; align-items: center; }
	.radar-chart { width: 100%; max-width: 380px; display: block; }
	.radar-grid { fill: none; stroke: var(--manual-border); stroke-width: 1; }
	.radar-axis { stroke: var(--manual-border); stroke-width: 1; }
	.radar-data {
		fill: color-mix(in srgb, var(--manual-brand) 10%, transparent);
		stroke: var(--manual-brand); stroke-width: 1.5; stroke-linejoin: round;
	}
	.radar-label { font-size: var(--text-2xs); fill: var(--manual-muted); }
	.chart-legend { display: flex; flex-direction: column; gap: .55rem; }
	.chart-legend { gap: 0; border-top: 1px solid var(--manual-border); }
	.legend-row { display: grid; grid-template-columns: 110px 1fr 28px; align-items: center; gap: .9rem; min-height: 40px; border-bottom: 1px solid var(--manual-border); }
	.legend-label { font-size: var(--text-sm); color: var(--manual-ink); }
	.legend-bar-wrap { height: 2px; background: var(--manual-border); overflow: hidden; }
	.legend-bar { height: 100%; background: var(--manual-ink); }
	.legend-value { font-size: var(--text-xs); color: var(--manual-muted); text-align: right; font-variant-numeric: tabular-nums; }

	/* ── Grid ────────────────────────────────────────────────────────────────── */
	.grid-spec { display: flex; flex-direction: column; gap: 1.25rem; }
	/*
	 * The SVG carries explicit `width` and `height` attributes so the browser
	 * knows its intrinsic aspect ratio. `max-width:100%; height:auto` then
	 * scales it proportionally without white-space bands on either side.
	 */
	.grid-svg {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: var(--manual-radius);
		box-shadow: 0 0 0 1px var(--manual-border);
	}
	/* Spec line, same as the logo specs: label over value, no chips */
	.grid-meta {
		display: flex; flex-wrap: wrap; gap: .75rem 2.5rem; margin: 0;
		padding-top: .9rem; border-top: 1px solid var(--manual-border);
	}
	.grid-meta div { display: flex; flex-direction: column; gap: 4px; }
	.grid-meta dt {
		color: var(--manual-muted); font-size: var(--manual-label-size); font-weight: 500;
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
	}
	.grid-meta dd { margin: 0; color: var(--manual-ink); font-size: var(--text-md); font-weight: 500; font-variant-numeric: tabular-nums; }

	/* ── Do / Don't ──────────────────────────────────────────────────────────── */
	/* Do / Don't: artwork on a stage, verdict as a small label. Only "don't"
	   carries colour — the rule being broken is what must stand out. */
	.do-dont-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 2rem 1.25rem; }
	.do-dont-item { display: flex; flex-direction: column; gap: .9rem; font-size: var(--text-md); line-height: 1.55; }
	.do-dont-item:not(:has(.dd-media)) { padding-top: .9rem; border-top: 1px solid var(--manual-border); }
	.do-dont-item.is-dont:not(:has(.dd-media)) { border-top-color: var(--manual-danger); }
	.dd-body { padding: 0; }
	.dd-media { position: relative; margin: 0; aspect-ratio: 4/3; background: #fff; border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent); overflow: hidden; }
	.dd-media img { width: 100%; height: 100%; object-fit: contain; padding: 10%; }
	.dd-strike { position: absolute; inset: 0; background: linear-gradient(to top right, transparent calc(50% - 1px), var(--manual-danger) calc(50% - .5px), var(--manual-danger) calc(50% + .5px), transparent calc(50% + 1px)); pointer-events: none; }
	.do-dont-item p { margin: 0; }
	.do-dont-badge {
		display: inline-flex; align-items: center; gap: 5px; margin-bottom: .4rem;
		color: var(--manual-ink); font-size: var(--manual-label-size); font-weight: 500;
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
	}
	.is-dont .do-dont-badge { color: var(--manual-danger); }

	/* ── Process ─────────────────────────────────────────────────────────────── */
	.process-list { list-style: none; display: flex; flex-direction: column; margin: 0; padding: 0; border-top: 1px solid var(--manual-border); }
	.process-step { display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.1rem 0; border-bottom: 1px solid var(--manual-border); }
	.step-num { min-width: 2.25rem; padding-top: .2rem; color: var(--manual-muted); font-family: var(--manual-mono); font-size: var(--text-sm); font-variant-numeric: tabular-nums; flex-shrink: 0; }
	.step-title { margin-bottom: .2rem; color: var(--manual-ink); font-weight: 500; font-size: var(--text-lg); letter-spacing: var(--tracking-snug); }
	.step-desc { margin: 0; color: var(--manual-muted); font-size: var(--text-base); line-height: 1.65; }

	/* ── Accordion ───────────────────────────────────────────────────────────── */
	.accordion { display: flex; flex-direction: column; border-top: 1px solid var(--manual-border); }
	.accordion-item { border-bottom: 1px solid var(--manual-border); }
	.accordion-q {
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		padding: 1.05rem 0; color: var(--manual-ink); font-weight: 500; font-size: var(--text-lg); letter-spacing: -.01em;
		cursor: pointer; list-style: none;
		transition: color .15s ease;
	}
	.accordion-q:hover { color: color-mix(in srgb, var(--manual-ink) 72%, transparent); }
	.accordion-q::-webkit-details-marker { display: none; }
	:global(.accordion-icon) { flex-shrink: 0; color: var(--manual-muted); transition: transform .25s var(--manual-ease, ease); }
	details[open] :global(.accordion-icon) { transform: rotate(90deg); }
	.accordion-a { max-width: 68ch; padding: 0 0 1.2rem; color: var(--manual-muted); font-size: var(--text-md); line-height: 1.7; }

	/* ── Table ───────────────────────────────────────────────────────────────── */
	.table-wrap { overflow-x: auto; }
	.block-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
	.block-table th { text-align: left; padding: 0 1rem .6rem 0; border-bottom: 1px solid var(--manual-border-strong); color: var(--manual-muted); font-size: var(--manual-label-size); font-weight: 500; text-transform: uppercase; letter-spacing: var(--manual-label-tracking); white-space: nowrap; }
	.block-table td { padding: .85rem 1rem .85rem 0; border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); vertical-align: top; line-height: 1.5; }

	/* ── HTML / Code ─────────────────────────────────────────────────────────── */
	.html-preview { display: block; width: 100%; min-height: 220px; box-sizing: border-box; margin-bottom: .85rem; border: 0; border-radius: var(--manual-radius); background: #fff; box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent); }
	.code-block { overflow-x: auto; margin: 0; padding: 1rem 1.15rem; border-radius: var(--manual-radius); background: var(--manual-stage); color: var(--manual-ink); font-family: var(--manual-mono); font-size: var(--text-sm); line-height: 1.7; white-space: pre; }

	/* ── Typo rules ──────────────────────────────────────────────────────────── */
	.tr-tabs {
		display: flex; gap: 1.5rem; border-bottom: 1px solid var(--manual-border); margin-bottom: 1.25rem;
	}
	.tr-tab {
		padding: 0 0 .6rem; font-size: var(--text-sm); font-weight: 500;
		border: none; background: transparent; color: var(--manual-muted); cursor: pointer;
		border-bottom: 1px solid transparent; margin-bottom: -1px;
		transition: color .14s, border-color .14s;
	}
	.tr-tab:hover { color: var(--manual-ink); }
	.tr-tab.active { color: var(--manual-ink); border-bottom-color: var(--manual-ink); }

	.tr-table-wrap { overflow-x: auto; }
	.tr-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
	.tr-table th {
		text-align: left; padding: 0 1rem .6rem 0;
		font-size: var(--manual-label-size); font-weight: 500; color: var(--manual-muted);
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
		border-bottom: 1px solid var(--manual-border-strong); white-space: nowrap;
	}
	.tr-table td {
		padding: .85rem 1rem .85rem 0; border-bottom: 1px solid var(--manual-border);
		color: var(--manual-ink); vertical-align: top; line-height: 1.55;
	}
	.tr-cat { font-weight: 500; color: var(--manual-ink); white-space: nowrap; }
	.tr-correct {
		font-family: var(--manual-mono); font-size: var(--text-sm);
		color: var(--manual-ink); white-space: nowrap;
	}
	.tr-wrong {
		font-family: var(--manual-mono); font-size: var(--text-sm);
		color: var(--manual-danger); white-space: nowrap;
		text-decoration: line-through; text-decoration-thickness: 1px; text-decoration-color: color-mix(in srgb, var(--manual-danger) 50%, transparent);
	}

	/* ── Colour swatches (Visualbook-style variants) ────────────────────────── */
	/* Format switch: plain underlined text tabs, same as the typo-rule tabs */
	.format-tabs {
		display: inline-flex; align-self: flex-start; gap: 1.5rem;
		max-width: 100%; overflow-x: auto; scrollbar-width: none;
		border-bottom: 1px solid var(--manual-border);
	}
	.format-tabs button {
		padding: 0 0 .6rem; border: 0; border-bottom: 1px solid transparent; margin-bottom: -1px; background: transparent;
		color: var(--manual-muted); font-family: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer; white-space: nowrap;
		transition: color .15s ease, border-color .15s ease;
	}
	.format-tabs button:hover { color: var(--manual-ink); }
	.format-tabs button.active { color: var(--manual-ink); border-bottom-color: var(--manual-ink); }
	.swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr)); gap: 12px; }
	.swatch-compact {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
		overflow: hidden; border-radius: var(--manual-radius);
	}
	.swatch-tile {
		position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 2rem;
		min-height: 168px; padding: .9rem 1rem; border: 0;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 9%, transparent);
		border-radius: var(--manual-radius); text-align: left; font-family: inherit; cursor: copy;
	}
	.swatch-compact .swatch-tile { min-height: 64px; gap: .15rem; justify-content: center; border-radius: 0; box-shadow: none; }
	.swatch-tile-name { font-size: var(--text-sm); font-weight: 500; opacity: .85; }
	.swatch-tile-value { display: inline-flex; align-items: center; gap: .3rem; font-family: var(--manual-mono, monospace); font-size: var(--text-sm); font-weight: 500; letter-spacing: .02em; }

	/* ── Font usage ──────────────────────────────────────────────────────────── */
	.usage-font { font-size: var(--text-md); font-weight: 500; text-align: center !important; text-transform: none !important; letter-spacing: -.01em !important; color: var(--manual-ink) !important; }
	.usage-cell { text-align: center; }
	.usage-yes { display: inline-grid; place-items: center; color: var(--manual-ink); }
	.usage-no { color: var(--manual-muted); opacity: .5; }

	/* ── Colour ratio ────────────────────────────────────────────────────────── */
	.ratio-block { display: flex; flex-direction: column; gap: 1rem; }
	.ratio-bar { display: flex; height: clamp(120px, 18vw, 180px); overflow: hidden; border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 7%, transparent); }
	.ratio-bar span { position: relative; display: flex; align-items: flex-end; min-width: 6px; padding: .7rem .8rem; overflow: hidden; }
	.ratio-bar em { font-style: normal; font-family: var(--manual-mono); font-size: var(--text-xs); font-variant-numeric: tabular-nums; white-space: nowrap; }
	.ratio-legend { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin: 0; padding: 0; list-style: none; font-size: var(--text-sm); color: var(--manual-ink); }
	.ratio-legend li { display: inline-flex; align-items: center; gap: .45rem; }
	.ratio-legend strong { color: var(--manual-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
	.ratio-dot { width: 10px; height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 12%, transparent); }

	/* ── Contrast checker ────────────────────────────────────────────────────── */
	/* A specimen on the left, the instrument on the right; separated by a
	   hairline, not boxed. */
	.cc-block {
		display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 0 clamp(1.5rem, 3vw, 2.5rem);
	}
	.cc-preview { grid-row: span 2; display: flex; flex-direction: column; justify-content: center; gap: .75rem; min-height: 300px; padding: clamp(1.25rem, 4%, 2.5rem); border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); transition: background .2s ease, color .2s ease; }
	.cc-big { font-size: clamp(3.5rem, 8vw, 6rem); font-weight: 500; line-height: 1; letter-spacing: var(--tracking-display); }
	.cc-sample { max-width: 32ch; font-size: var(--text-lg); line-height: 1.5; }
	.cc-controls { display: flex; flex-direction: column; gap: 1.1rem; padding: 0 0 1.25rem; border-bottom: 1px solid var(--manual-border); }
	.cc-field { display: flex; flex-direction: column; gap: .5rem; }
	.cc-label { font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; color: var(--manual-muted); }
	.cc-input { display: flex; align-items: center; gap: .5rem; }
	.cc-input input[type="color"] { width: 36px; height: 36px; padding: 0; border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: none; cursor: pointer; }
	.cc-input input[type="text"] {
		flex: 1; min-width: 0; height: 36px; padding: 0 .7rem; border: 1px solid var(--manual-border); border-radius: var(--manual-radius);
		background: transparent; color: var(--manual-ink); font-family: var(--manual-mono, monospace); font-size: var(--text-sm);
		transition: border-color .15s ease;
	}
	.cc-input input[type="text"]:hover { border-color: var(--manual-border-strong); }
	.cc-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
	.cc-swatch { width: 20px; height: 20px; padding: 0; border: 0; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 14%, transparent); border-radius: 50%; cursor: pointer; }
	.cc-swatch.active { outline: 1px solid var(--manual-ink); outline-offset: 2px; }
	.cc-swap {
		display: inline-flex; align-items: center; gap: .4rem; align-self: flex-start; height: 32px; padding: 0 .75rem;
		border: 1px solid var(--manual-border); border-radius: var(--manual-radius); background: transparent; color: var(--manual-ink);
		font-family: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
		transition: border-color .15s ease;
	}
	.cc-swap:hover { border-color: var(--manual-border-strong); }
	.cc-results { display: flex; flex-direction: column; padding: 1.1rem 0 0; }
	.cc-ratio { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: .6rem; font-size: var(--text-sm); color: var(--manual-muted); }
	.cc-ratio strong { color: var(--manual-ink); font-size: 2rem; font-weight: 500; letter-spacing: var(--tracking-tight); font-variant-numeric: tabular-nums; }
	.cc-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .55rem 0; border-top: 1px solid var(--manual-border); font-size: var(--text-sm); color: var(--manual-ink); }
	.cc-row em { color: var(--manual-ink); font-size: var(--text-xs); font-style: normal; font-weight: 500; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
	.cc-row.fail em { color: var(--manual-danger); }
	@container manual-blocks (max-width: 640px) {
		.cc-block { grid-template-columns: minmax(0, 1fr); }
		.cc-preview { grid-row: auto; min-height: 200px; }
	}

	/* ── Hotspots ────────────────────────────────────────────────────────────── */
	.hs-figure { display: flex; flex-direction: column; gap: 1.25rem; margin: 0; }
	.hs-stage { position: relative; width: fit-content; max-width: 100%; margin-inline: auto; border-radius: var(--manual-radius); }
	.hs-stage img { display: block; width: auto; max-width: 100%; height: auto; max-height: min(80vh, 760px); border-radius: inherit; }
	/* Markers: small, exact, still — a technical annotation, not a notification */
	.hs-dot {
		position: absolute; z-index: 2; display: grid; place-items: center; width: 24px; height: 24px; transform: translate(-50%, -50%);
		border: 0; border-radius: 50%; background: #fff; color: #111;
		font-family: inherit; font-size: var(--text-2xs); font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer;
		box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.25);
		transition: transform .2s var(--manual-ease, ease), background .15s ease, color .15s ease;
	}
	.hs-dot:hover, .hs-dot.active { transform: translate(-50%, -50%) scale(1.1); background: var(--manual-brand); color: #fff; }
	.hs-tip {
		position: absolute; z-index: 3; display: flex; flex-direction: column; gap: .2rem;
		width: max-content; max-width: min(280px, 70vw); margin: 0 0 0 20px; transform: translateY(-50%);
		padding: .65rem .8rem; border-radius: var(--manual-radius); background: var(--manual-ink); color: var(--manual-paper);
		font-size: var(--text-sm); line-height: 1.45; box-shadow: 0 12px 32px rgba(0,0,0,.24); pointer-events: none;
	}
	.hs-tip.left { margin: 0 20px 0 0; transform: translate(-100%, -50%); }
	.hs-tip strong { font-weight: 500; }
	.hs-tip span { opacity: .75; }
	.hs-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 0 1.5rem; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--manual-border); }
	.hs-list li { border-bottom: 1px solid var(--manual-border); }
	.hs-list button { display: flex; align-items: flex-start; gap: .75rem; width: 100%; padding: .75rem 0; border: 0; background: transparent; color: var(--manual-ink); font-family: inherit; text-align: left; cursor: pointer; }
	.hs-list strong { display: block; font-size: var(--text-sm); font-weight: 500; transition: color .15s ease; }
	.hs-list li.active strong, .hs-list button:hover strong { color: var(--manual-brand); }
	.hs-list small { display: block; margin-top: 2px; color: var(--manual-muted); font-size: var(--text-sm); line-height: 1.45; }
	.hs-num { flex: 0 0 auto; min-width: 1.4rem; padding-top: 1px; color: var(--manual-muted); font-family: var(--manual-mono); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }

	/* ── Code shell ──────────────────────────────────────────────────────────── */
	.code-shell { overflow: hidden; border-radius: var(--manual-radius); background: var(--manual-stage); }
	.code-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: .4rem .45rem .4rem 1.15rem; border-bottom: 1px solid var(--manual-border);
	}
	.code-lang { color: var(--manual-muted); font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; }
	.code-copy {
		display: inline-flex; align-items: center; gap: .35rem; height: 28px; padding: 0 .6rem;
		border: 0; border-radius: var(--manual-radius); background: transparent; color: var(--manual-muted);
		font-family: inherit; font-size: var(--text-xs); font-weight: 500; cursor: pointer;
		transition: color .15s ease;
	}
	.code-copy:hover { color: var(--manual-ink); }
	.code-shell .code-block { border-radius: 0; background: transparent; }

	/* ── Quote ───────────────────────────────────────────────────────────────── */
	.quote-block { position: relative; margin: 0; padding: clamp(1.5rem, 3vw, 2.25rem) 0; border-top: 1px solid var(--manual-border-strong); border-bottom: 1px solid var(--manual-border); }
	.quote-mark { display: block; margin-bottom: 1rem; color: var(--manual-muted); }
	.quote-block blockquote {
		margin: 0; color: var(--manual-ink);
		font-size: clamp(1.15rem, 2vw, 1.4rem); font-weight: 400; line-height: 1.45;
		letter-spacing: -.012em; text-wrap: pretty;
	}
	.quote-block.large blockquote { max-width: 26ch; font-size: clamp(1.6rem, 3.4vw, 2.6rem); font-weight: 400; line-height: 1.14; letter-spacing: var(--tracking-tight); text-wrap: balance; }
	.quote-block figcaption { display: flex; flex-wrap: wrap; gap: .25rem .6rem; margin-top: 1.5rem; font-size: var(--text-sm); }
	.quote-block figcaption strong { color: var(--manual-ink); font-weight: 500; }
	.quote-block figcaption span { color: var(--manual-muted); }

	/* ── Callout ─────────────────────────────────────────────────────────────── */
	/* One note language across the manual: hairline in the tone colour, a
	   small icon, text on paper. */
	.callout-block {
		--tone: var(--manual-info, #2563eb);
		display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: .75rem;
		max-width: 72ch;
		padding: .15rem 0 .15rem 1rem;
		border-left: 1px solid var(--tone);
	}
	.callout-block.tone-success { --tone: var(--manual-success, #16a34a); }
	.callout-block.tone-warning { --tone: var(--manual-warning, #d97706); }
	.callout-block.tone-danger  { --tone: var(--manual-danger, #dc2626); }
	.callout-block-icon { display: grid; place-items: center; height: 1.4em; color: var(--tone); font-size: var(--text-md); }
	.callout-block-icon :global(svg) { width: 16px; height: 16px; }
	.callout-block-body { display: flex; flex-direction: column; gap: .2rem; min-width: 0; }
	.callout-block-body strong { color: var(--manual-ink); font-size: var(--text-md); font-weight: 500; line-height: 1.4; }
	.callout-block-body p { margin: 0; color: var(--manual-muted); font-size: var(--text-md); line-height: 1.6; white-space: pre-line; }
	.callout-block-body strong + p { margin-top: .05rem; }

	/* ── Stats ───────────────────────────────────────────────────────────────── */
	/* Figures set large and light between hairline columns */
	.stats-grid {
		display: flex;
		flex-wrap: wrap;
		margin: 0;
		border-top: 1px solid var(--manual-border-strong);
	}
	.stat { flex: 1 1 max(160px, calc(100% / var(--stat-cols))); display: flex; flex-direction: column; gap: .35rem; padding: 1.25rem 1.5rem 0 0; }
	.stat + .stat { padding-left: 1.25rem; border-left: 1px solid var(--manual-border); }
	.stat-value {
		color: var(--manual-ink);
		font-size: clamp(2.25rem, 4.2vw, 3.25rem); font-weight: 300; line-height: 1;
		letter-spacing: -.04em; font-variant-numeric: tabular-nums;
	}
	.stat-label { margin-top: .6rem; color: var(--manual-ink); font-size: var(--text-sm); font-weight: 500; }
	.stat-desc { color: var(--manual-muted); font-size: var(--text-sm); line-height: 1.5; }

	/* ── Embed ───────────────────────────────────────────────────────────────── */
	.embed-figure { margin: 0; }
	.embed-frame {
		position: relative; width: 100%; overflow: hidden;
		border-radius: var(--manual-radius);
		background: #000;
	}
	.embed-audio { display: block; width: 100%; }
	.embed-frame iframe, .embed-frame video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: contain; }

	/* ── Text + image ────────────────────────────────────────────────────────── */
	.text-image { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem); align-items: center; }
	.text-image.no-image { grid-template-columns: minmax(0, 1fr); }
	.text-image.image-left .text-image-media { order: -1; }
	.text-image-copy { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
	.text-image-copy h3 { margin: 0; color: var(--manual-ink); font-size: clamp(1.25rem, 2vw, 1.6rem); font-weight: 500; letter-spacing: -.022em; line-height: 1.2; text-wrap: balance; }
	.text-image-cta {
		display: inline-flex; align-items: center; gap: .4rem; align-self: flex-start;
		height: 38px; padding: 0 .95rem; margin-top: .25rem; border-radius: var(--manual-radius);
		background: var(--manual-ink); color: var(--manual-paper);
		font-size: var(--text-sm); font-weight: 500; text-decoration: none;
		transition: opacity .15s ease;
	}
	.text-image-cta:hover { opacity: .82; }
	.text-image-media {
		margin: 0; overflow: hidden; border-radius: var(--manual-radius);
		background: var(--manual-stage);
		aspect-ratio: 4/3;
	}
	.text-image-media img { display: block; width: 100%; height: 100%; object-fit: cover; }
	.text-image-media img.contain { object-fit: contain; padding: clamp(1rem, 4%, 2.5rem); }

	/* ── Links ───────────────────────────────────────────────────────────────── */
	/* Resources as an index: hairline rows, arrow nudges on hover */
	.links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 0 2rem; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--manual-border); }
	.links-grid li { display: flex; border-bottom: 1px solid var(--manual-border); }
	.link-card {
		display: flex; flex: 1; align-items: center; gap: .85rem; min-width: 0;
		padding: .9rem 0;
		color: var(--manual-ink); text-decoration: none;
	}
	.link-card-icon {
		display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px;
		border-radius: var(--manual-radius); background: var(--manual-stage); color: var(--manual-ink);
	}
	.link-card-body { display: flex; flex: 1; flex-direction: column; gap: .15rem; min-width: 0; }
	.link-card-body strong { overflow: hidden; font-size: var(--text-md); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; transition: color .15s ease; }
	.link-card-body small { overflow: hidden; color: var(--manual-muted); font-size: var(--text-sm); text-overflow: ellipsis; white-space: nowrap; }
	.link-card-arrow { display: grid; color: var(--manual-muted); transition: color .15s ease, transform .2s var(--manual-ease, ease); }
	.link-card:hover .link-card-arrow { color: var(--manual-ink); transform: translate(2px, -2px); }

	@container manual-blocks (max-width: 640px) {
		.text-image { grid-template-columns: minmax(0, 1fr); }
		.text-image.image-left .text-image-media { order: 0; }
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
		.radar-chart { max-width: 320px; margin: 0 auto; }
		.logo-preview-wrap { grid-template-columns: 1fr; }
		.legend-row { grid-template-columns: 90px 1fr 24px; }
	}
</style>
