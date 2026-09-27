<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const gcols = $derived(Math.max(1, Number(block.config.columns ?? 12)));
	const grows = $derived(Math.max(0, Number(block.config.rows ?? 0)));
	const ggutter = $derived(Number(block.config.gutter ?? 24));
	const ggutterR = $derived(Number(block.config.gutterRow ?? ggutter));
	const gunit = $derived(String(block.config.unit ?? (String(block.config.medium ?? 'web') === 'print' ? 'mm' : 'px')));
	const gmedium = $derived(String(block.config.medium ?? 'web'));
	const gformat = $derived(String(block.config.format ?? (gmedium === 'print' ? 'A4' : 'web')));
	const gorient = $derived(String(block.config.orientation ?? 'portrait'));
	const gbaseline = $derived(Number(block.config.baselineGrid ?? 0));
	// 4-sided margins
	const gmarginBase = $derived(Number(block.config.margin ?? 40));
	const gmT = $derived(Number(block.config.marginTop    ?? gmarginBase));
	const gmR = $derived(Number(block.config.marginRight  ?? gmarginBase));
	const gmB = $derived(Number(block.config.marginBottom ?? gmarginBase));
	const gmL = $derived(Number(block.config.marginLeft   ?? gmarginBase));
	// Reference document dimensions in native units
	const FDIMS = $derived({ web:[Number(block.config.maxWidth??1280),720], A4:[210,297], A3:[420,297], A5:[148,210], Letter:[216,279], square:[1000,1000], story:[1000,1778] } as Record<string, number[]>);
	const fdim = $derived(FDIMS[gformat] ?? FDIMS['web']);
	const docW = $derived(gorient === 'landscape' && fdim[0] < fdim[1] ? fdim[1] : gorient === 'portrait' && fdim[0] > fdim[1] ? fdim[1] : fdim[0]);
	const docH = $derived(gorient === 'landscape' && fdim[0] < fdim[1] ? fdim[0] : gorient === 'portrait' && fdim[0] > fdim[1] ? fdim[0] : fdim[1]);
	// SVG internal coordinate space (docW → 800 units)
	const SW = $derived(800);
	const SH = $derived(Math.round(SW * docH / docW));
	const smgL = $derived(gmL / docW * SW);
	const smgR = $derived(gmR / docW * SW);
	const smgT = $derived(gmT / docH * SH);
	const smgB = $derived(gmB / docH * SH);
	const sgt = $derived(ggutter  / docW * SW);
	const sgtR = $derived(ggutterR / docH * SH);
	const iW = $derived(Math.max(0, SW - smgL - smgR));
	const iH = $derived(Math.max(0, SH - smgT - smgB));
	// Display dimensions: SVG element gets explicit width/height so the browser
	// knows the intrinsic aspect ratio — no weird white space from `width:100%`.
	// Portrait print formats are capped at 380px tall; web/social stay around 200px.
	const maxHNum = $derived(gmedium === 'print' ? 380 : gformat === 'story' ? 320 : gformat === 'square' ? 240 : 200);
	const dispH = $derived(maxHNum);
	const dispW = $derived(Math.round(maxHNum * docW / docH));
	// Annotation sizes are computed in SVG units so they appear ≈11 px on screen
	// regardless of format (portrait A4 vs wide web differ 2× in scale).
	const svgScale = $derived(dispH / SH);
	const annFS = $derived(Math.max(20, Math.round(11 / svgScale)));
	const annTk = $derived(Math.max(11, Math.round(5.5 / svgScale)));
	const annSW = $derived(Math.max(1,  Math.round(0.9 / svgScale)));
	// Overflow-safe column/gutter display widths.
	// Configured gutter+margin may exceed content width (e.g. 12 cols × 24 mm on A4).
	// In that case we proportionally redistribute space so the visual always looks right;
	// annotation labels still show the real configured values.
	const rawColW = $derived((iW - (gcols - 1) * sgt) / gcols);
	const minVisColW = $derived(iW * 0.042);
	const overflowed = $derived(rawColW < minVisColW);
	const effSgt = $derived(
		overflowed
		? Math.max(0.5, (iW - gcols * minVisColW) / Math.max(1, gcols - 1))
		: sgt
	);
	const colW = $derived(overflowed ? minVisColW : rawColW);
	// Rows: same overflow protection
	const rawRowH = $derived(grows > 0 ? (iH - (grows - 1) * sgtR) / grows : iH);
	const minVisRowH = $derived(iH * 0.04);
	const rowsOvf = $derived(grows > 0 && rawRowH < minVisRowH);
	const effSgtR = $derived(rowsOvf ? Math.max(0.5, (iH - grows * minVisRowH) / Math.max(1, grows - 1)) : sgtR);
	const rowH = $derived(grows > 0 ? (rowsOvf ? minVisRowH : rawRowH) : iH);
	// Baseline grid pitch in SVG units
	const sBaselineH = $derived(gbaseline > 0 ? (gbaseline / docH * SH) : 0);
	// Show annotations only when the measured space is ≥14 px on screen
	const showLeftAnn = $derived(smgL * svgScale >= 14);
	const showTopAnn = $derived(smgT * svgScale >= 12);
	const showGutterAnn = $derived(gcols >= 2 && effSgt * svgScale >= 9 && !overflowed);
	// Margin display label
	const marginsEqual = $derived(gmT === gmR && gmR === gmB && gmB === gmL);
	const marginLabel = $derived(marginsEqual ? `${gmT} ${gunit}` : `${gmT} / ${gmR} / ${gmB} / ${gmL} ${gunit}`);
</script>

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

<style>
	.grid-spec { display: flex; flex-direction: column; gap: 20px; }
	.grid-svg {
		display: block;
		max-width: 100%;
		height: auto;
		border-radius: var(--manual-radius);
		box-shadow: 0 0 0 1px var(--manual-border);
	}
	.grid-meta {
		display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 0;
		padding-top: 16px; border-top: 1px solid var(--manual-border);
	}
	.grid-meta div { display: flex; flex-direction: column; gap: 4px; }
	.grid-meta dt {
		color: var(--manual-muted); font-size: var(--manual-label-size); font-weight: 500;
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
	}
	.grid-meta dd { margin: 0; color: var(--manual-ink); font-size: var(--text-md); font-weight: 500; font-variant-numeric: tabular-nums; }
</style>
