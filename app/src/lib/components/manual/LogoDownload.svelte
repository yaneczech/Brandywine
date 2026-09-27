<!--
  LogoDownload — logo variants with live padding, SVG/PNG export in the browser
  and a server-built ZIP of all versions.
-->
<script lang="ts">
	import { IconDownload, IconFileZip, IconDeviceDesktop, IconPrinter, IconRulerMeasure } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';
	import { padSvg, svgBox } from '$lib/manual/svg-pad';

	type Variant = {
		label?: string;
		url?: string;
		background?: string; // 'light' | 'dark' | #hex
		files?: { label?: string; url?: string }[];
	};

	const { blockId, config }: { blockId: string; config: Record<string, unknown> } = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const variants = $derived(
		(Array.isArray(config.variants) ? (config.variants as Variant[]) : []).filter((v) => v?.url)
	);
	let active = $state(0);
	const variant = $derived(variants[Math.min(active, Math.max(0, variants.length - 1))]);

	let padX = $state(0);
	let padY = $state(0);
	let pngWidth = $state(1024);
	let busy = $state(false);

	// Natural size of the current logo (from the SVG viewBox or the bitmap)
	let natural = $state<{ w: number; h: number } | null>(null);
	let svgText = $state<string | null>(null);

	function assetSrc(path: string | undefined): string {
		const value = String(path ?? '');
		if (!value) return '';
		if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
		return `/uploads/${value.replace(/^\/+/, '')}`;
	}

	const src = $derived(assetSrc(variant?.url));
	const isSvg = $derived(/\.svg(\?.*)?$/i.test(src));
	const baseName = $derived(
		(variant?.label || String(config.heading || 'logo'))
			.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logo'
	);

	const stageBg = $derived.by(() => {
		const bg = variant?.background ?? 'light';
		if (bg === 'dark') return '#111111';
		if (bg === 'light' || !/^#[0-9a-f]{6}$/i.test(bg)) return '#ffffff';
		return bg;
	});
	const stageIsDark = $derived.by(() => {
		const hex = stageBg.slice(1);
		const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
		return 0.299 * r + 0.587 * g + 0.114 * b < 140;
	});

	$effect(() => {
		const current = src;
		natural = null;
		svgText = null;
		if (!current) return;
		let cancelled = false;
		if (isSvg) {
			fetch(current)
				.then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
				.then((text) => {
					if (cancelled) return;
					svgText = text;
					const box = svgBox(text);
					if (box) natural = { w: box.width, h: box.height };
				})
				.catch(() => { /* preview still works through <img>; exports fall back to raster */ });
		}
		const img = new Image();
		img.onload = () => {
			if (!cancelled && !natural && img.naturalWidth) natural = { w: img.naturalWidth, h: img.naturalHeight };
		};
		img.src = current;
		return () => { cancelled = true; };
	});

	const aspect = $derived(natural ? (natural.h * (1 + (2 * padY) / 100)) / (natural.w * (1 + (2 * padX) / 100)) : null);
	const pngHeight = $derived(aspect ? Math.round(pngWidth * aspect) : null);
	const insetX = $derived((padX / (100 + 2 * padX)) * 100);
	const insetY = $derived((padY / (100 + 2 * padY)) * 100);

	function save(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 2000);
	}

	function downloadSvg() {
		if (!svgText) return;
		save(new Blob([padSvg(svgText, padX, padY)], { type: 'image/svg+xml' }), `${baseName}.svg`);
	}

	async function downloadPng() {
		if (!natural || !pngHeight) return;
		busy = true;
		try {
			const width = Math.min(8000, Math.max(16, Math.round(pngWidth)));
			const height = Math.round(width * (aspect ?? 1));
			const logoW = width * (natural.w / (natural.w * (1 + (2 * padX) / 100)));
			const logoH = height * (natural.h / (natural.h * (1 + (2 * padY) / 100)));
			let drawSrc = src;
			let revoke: string | null = null;
			if (svgText) {
				// Give the SVG an explicit pixel size so the browser rasterises it sharply
				const sized = svgText.replace(/<svg\b([^>]*)>/i, (tag) =>
					tag.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi, '')
						.replace(/^<svg\b/i, `<svg width="${Math.round(logoW)}" height="${Math.round(logoH)}"`));
				revoke = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
				drawSrc = revoke;
			}
			const img = new Image();
			img.decoding = 'async';
			await new Promise<void>((resolve, reject) => {
				img.onload = () => resolve();
				img.onerror = () => reject(new Error('load'));
				img.src = drawSrc;
			});
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(img, (width - logoW) / 2, (height - logoH) / 2, logoW, logoH);
			if (revoke) URL.revokeObjectURL(revoke);
			const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
			if (blob) save(blob, `${baseName}-${width}px.png`);
		} catch {
			// Canvas export can fail for cross-origin sources; the ZIP pack still works.
		} finally {
			busy = false;
		}
	}

	const zipHref = $derived(`/api/manual/blocks/${blockId}/logo-pack?px=${padX}&py=${padY}`);
	const minPx = $derived(Number(config.minSizePx) || null);
	const minMm = $derived(Number(config.minSizeMm) || null);
</script>

{#if variants.length}
	<div class="ld">
		{#if minPx || minMm}
			<div class="ld-min">
				<IconRulerMeasure size={16} stroke={1.8} />
				<span>{t.logoMinHeight}:</span>
				{#if minPx}<span><IconDeviceDesktop size={14} stroke={1.8} /> <strong>{minPx} px</strong> {t.onScreens}</span>{/if}
				{#if minMm}<span><IconPrinter size={14} stroke={1.8} /> <strong>{minMm} mm</strong> {t.inPrint}</span>{/if}
			</div>
		{/if}

		{#if variants.length > 1}
			<div class="ld-variants" role="tablist" aria-label={t.logoVariant}>
				{#each variants as v, i (i)}
					<button role="tab" aria-selected={active === i} class:active={active === i} onclick={() => (active = i)}>
						{v.label || `Logo ${i + 1}`}
					</button>
				{/each}
			</div>
		{/if}

		<div class="ld-card">
			<div class="ld-stage" class:dark={stageIsDark} style="background:{stageBg}">
				<div class="ld-canvas" style={aspect ? `aspect-ratio:${1 / aspect};width:min(100%, 440px, ${Math.round(240 / aspect)}px)` : ''}>
					{#if src && aspect}
						<div class="ld-logo" style="inset:{insetY}% {insetX}%">
							<img src={src} alt={variant?.label || 'Logo'} />
						</div>
					{:else if src}
						<img class="ld-loading" src={src} alt={variant?.label || 'Logo'} />
					{/if}
				</div>
			</div>

			<div class="ld-controls">
				<div class="ld-sliders">
					<label>
						<span>{t.paddingHorizontal}</span>
						<input type="range" min="0" max="50" step="1" bind:value={padX} />
						<output>{padX} %</output>
					</label>
					<label>
						<span>{t.paddingVertical}</span>
						<input type="range" min="0" max="50" step="1" bind:value={padY} />
						<output>{padY} %</output>
					</label>
				</div>

				<div class="ld-actions">
					<div class="ld-png">
						<label class="ld-width">
							<span class="sr-only">{t.pngWidth}</span>
							<input type="number" min="16" max="8000" step="1" bind:value={pngWidth} aria-label={t.pngWidth} />
							<span class="ld-unit">{pngHeight ? `px × ${pngHeight} px` : 'px'}</span>
						</label>
						<button class="ld-btn" onclick={downloadPng} disabled={busy || !natural}>
							<IconDownload size={15} stroke={2} /> PNG
						</button>
					</div>
					{#if isSvg}
						<button class="ld-btn" onclick={downloadSvg} disabled={!svgText}>
							<IconDownload size={15} stroke={2} /> SVG
						</button>
					{/if}
					{#each variant?.files ?? [] as file, fi (fi)}
						{#if file.url}
							<a class="ld-btn" href={assetSrc(file.url)} download>
								<IconDownload size={15} stroke={2} /> {file.label || file.url.split('.').pop()?.toUpperCase()}
							</a>
						{/if}
					{/each}
				</div>
			</div>
		</div>

		<a class="ld-zip" href={zipHref} download>
			<IconFileZip size={18} stroke={1.8} />
			<span><strong>{t.downloadAllVersions}</strong><small>{t.logoPackHint}</small></span>
		</a>
	</div>
{/if}

<style>
	.ld { display: flex; flex-direction: column; gap: 16px; }
	.ld-min {
		display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px;
		padding: 12px 0; border-block: 1px solid var(--manual-border);
		color: var(--manual-muted); font-size: var(--text-sm);
	}
	.ld-min span { display: inline-flex; align-items: center; gap: 4px; }
	.ld-min strong { color: var(--manual-ink); font-weight: 500; font-variant-numeric: tabular-nums; }
	/* Variants as underlined text tabs — the product's single tab style */
	.ld-variants {
		display: inline-flex; align-self: flex-start; gap: 24px; max-width: 100%; overflow-x: auto;
		border-bottom: 1px solid var(--manual-border); scrollbar-width: none;
	}
	.ld-variants button {
		padding: 0 0 8px; margin-bottom: -1px; border: 0; border-bottom: 1px solid transparent; background: transparent; color: var(--manual-muted);
		font-family: inherit; font-size: var(--text-sm); font-weight: 500; white-space: nowrap; cursor: pointer;
		transition: color .15s ease, border-color .15s ease;
	}
	.ld-variants button:hover:not(.active) { color: var(--manual-ink); }
	.ld-variants button.active { color: var(--manual-ink); border-bottom-color: var(--manual-ink); }
	.ld-card { display: flex; flex-direction: column; }
	.ld-stage {
		display: grid; place-items: center; min-height: 280px; padding: clamp(2rem, 7%, 4rem);
		border-radius: var(--manual-radius);
		background-color: #fff;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent);
	}
	.ld-stage.dark { background-color: #111; box-shadow: none; }
	.ld-canvas {
		position: relative; width: min(100%, 420px);
		outline: 1px dashed color-mix(in srgb, var(--manual-brand) 60%, transparent); outline-offset: 0;
		transition: aspect-ratio .15s ease;
	}
	.ld-canvas:not([style*="aspect-ratio"]) { min-height: 120px; }
	.ld-logo { position: absolute; }
	.ld-logo img { display: block; width: 100%; height: 100%; object-fit: contain; }
	.ld-loading { display: block; max-width: 100%; max-height: 160px; margin: auto; }
	.ld-controls { display: flex; flex-direction: column; gap: 16px; padding: 20px 0 0; }
	.ld-sliders { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px 24px; }
	.ld-sliders label { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px 12px; font-size: var(--text-sm); color: var(--manual-muted); }
	.ld-sliders label span { grid-column: 1 / -1; }
	.ld-sliders input { width: 100%; height: 24px; accent-color: var(--manual-brand); }
	.ld-sliders output { min-width: 3.2em; color: var(--manual-ink); font-size: var(--text-sm); font-weight: 500; text-align: right; font-variant-numeric: tabular-nums; }
	.ld-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.ld-png { display: inline-flex; align-items: center; gap: 8px; margin-right: auto; }
	.ld-width { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px; border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius); background: transparent; }
	.ld-width input { width: 64px; border: 0; background: transparent; color: var(--manual-ink); font-family: inherit; font-size: var(--text-base); font-variant-numeric: tabular-nums; outline: none; }
	.ld-unit { color: var(--manual-muted); font-size: var(--text-xs); white-space: nowrap; font-variant-numeric: tabular-nums; }
	.ld-btn {
		display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 12px;
		border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius);
		background: transparent; color: var(--manual-ink); font-family: inherit; font-size: var(--text-sm); font-weight: 500;
		text-decoration: none; cursor: pointer; transition: border-color .15s ease;
	}
	.ld-btn:hover:not(:disabled) { border-color: var(--manual-border-strong); }
	.ld-btn:disabled { opacity: .45; cursor: default; }
	.ld-zip {
		display: flex; align-items: center; gap: 12px; padding: 16px 0;
		border-block: 1px solid var(--manual-border);
		color: var(--manual-ink); text-decoration: none;
	}
	.ld-zip :global(svg) { flex: 0 0 auto; color: var(--manual-muted); transition: color .15s ease, transform .2s var(--manual-ease, ease); }
	.ld-zip:hover :global(svg) { color: var(--manual-ink); transform: translateY(1px); }
	.ld-zip span { display: flex; flex-direction: column; gap: .1rem; }
	.ld-zip strong { font-size: var(--text-md); font-weight: 500; }
	.ld-zip small { color: var(--manual-muted); font-size: var(--text-sm); }
	.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
	@media (max-width: 520px) {
		.ld-png { width: 100%; margin-right: 0; }
		.ld-png .ld-btn { margin-left: auto; }
	}
</style>
