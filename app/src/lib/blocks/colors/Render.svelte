<script lang="ts">
	import type { BlockRenderProps, ColorRow, PaletteRow } from '../types';
	import { hexToRgbStr, wcagContrast, contrastOnColor, wcagBadge, computeHsl, computeCmyk, fmtHsl, fmtCmyk, generateShades, productionRefsFor } from '../_shared/color';
	import { subHeadingTag as headingTagFor } from '../_shared/config';
	import { copyToClipboard } from '../_shared/clipboard';
	import { colorsForSource } from '$lib/manual/color-source';
	import { IconCheck, IconCopy } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const subHeadingTag = $derived(headingTagFor(block.config));

	const filteredColors = $derived(colorsForSource(data.colorRows, data.paletteRows, block.config.source));

	const colorsByPalette = $derived.by(() => {
		const groups: { palette: PaletteRow | null; colors: ColorRow[] }[] = [];
		const noPalette = filteredColors.filter(c => !c.paletteId);
		if (noPalette.length) groups.push({ palette: null, colors: noPalette });
		for (const palette of data.paletteRows) {
			const cols = filteredColors.filter(c => c.paletteId === palette.id);
			if (cols.length) groups.push({ palette, colors: cols });
		}
		return groups;
	});

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

	let copiedKey = $state('');
	function copyValue(key: string, value: string) {
		copiedKey = key;
		setTimeout(() => { if (copiedKey === key) copiedKey = ''; }, 1400);
		void copyToClipboard(value);
	}
</script>

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
					<svelte:element this={subHeadingTag} class="palette-name">{group.palette?.name ?? t.colors}</svelte:element>
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
							<svelte:element this={subHeadingTag} id="palette-{block.id}-{gi}" class="palette-name">
								{group.palette?.name ?? t.colors}
							</svelte:element>
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

<style>
	.colors-wrap {
		display: flex;
		flex-direction: column;
		gap: clamp(2.5rem, 4vw, 3.5rem);
	}
	.palette-section {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.palette-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(120px, 28%);
		gap: 16px;
		align-items: center;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--manual-border);
	}
	.palette-title-wrap {
		display: flex;
		align-items: baseline;
		gap: 8px;
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
		gap: 32px 20px;
		align-items: start;
	}
	.color-card {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
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
		padding: 12px 12px;
		border: 0;
		border-radius: var(--manual-radius);
		/* keeps near-paper colours visible without a frame */
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 7%, transparent);
		text-align: left;
		cursor: pointer;
		transition: transform .25s var(--manual-ease);
	}
	.color-card:has(.shades-strip) .color-swatch { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
	.color-swatch:hover .copy-hint, .color-swatch:focus-visible .copy-hint {
		opacity: .8;
	}
	.color-swatch:focus-visible, .cv-row:focus-visible, .shade-btn:focus-visible {
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
		border-radius: var(--manual-control-radius);
		opacity: 0;
		transition: opacity .16s ease;
	}
	.color-swatch:hover .swatch-copy-icon, .color-swatch:focus-visible .swatch-copy-icon { opacity: .75; }
	.swatch-bottom {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}
	.swatch-hex-val {
		font-family: var(--manual-mono);
		font-size: var(--text-sm);
		font-weight: 500;
		letter-spacing: .02em;
	}
	.copy-hint, .copied-flash {
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
		gap: 12px;
		padding-top: 12px;
	}
	.color-title-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
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
		gap: 8px;
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
	.cv-row:hover .cv-copy, .cv-row:focus-visible .cv-copy { opacity: 1; }
	.production-detail {
		display: flex;
		flex-direction: column;
		gap: 4px;
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
		gap: 8px;
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
	.production-row:hover .cv-copy, .production-row:focus-visible .cv-copy { opacity: 1; }
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
	.contrast-detail {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.contrast-pair {
		display: grid;
		grid-template-columns: 24px minmax(0, 1fr);
		gap: 8px;
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
		column-gap: 4px;
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
		min-height: 24px;
		overflow: hidden;
		border-radius: 0 0 var(--manual-radius) var(--manual-radius);
	}
	.shade-btn {
		position: relative;
		display: grid;
		flex: 1;
		min-width: 0;
		height: 24px;
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
		padding: 2px 4px;
		border-radius: min(var(--manual-control-radius), 4px);
		background: var(--manual-ink);
		color: var(--manual-paper);
		font-family: var(--manual-mono);
		font-size: var(--text-2xs);
		opacity: 0;
		pointer-events: none;
		white-space: nowrap;
		transition: opacity .12s ease;
	}
	.shade-btn:hover::after, .shade-btn:focus-visible::after { opacity: 1; }
	.shade-flash {
		color: #fff;
		font-size: var(--text-2xs);
		font-weight: 500;
		mix-blend-mode: difference;
	}
	.format-tabs {
		display: inline-flex; align-self: flex-start; gap: 24px;
		max-width: 100%; overflow-x: auto; scrollbar-width: none;
		border-bottom: 1px solid var(--manual-border);
	}
	.format-tabs button {
		padding: 0 0 8px; border: 0; border-bottom: 1px solid transparent; margin-bottom: -1px; background: transparent;
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
		position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 32px;
		min-height: 168px; padding: 16px 16px; border: 0;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 9%, transparent);
		border-radius: var(--manual-radius); text-align: left; font-family: inherit; cursor: copy;
	}
	.swatch-compact .swatch-tile { min-height: 64px; gap: .15rem; justify-content: center; border-radius: 0; box-shadow: none; }
	.swatch-tile-name { font-size: var(--text-sm); font-weight: 500; opacity: .85; }
	.swatch-tile-value { display: inline-flex; align-items: center; gap: 4px; font-family: var(--manual-mono, monospace); font-size: var(--text-sm); font-weight: 500; letter-spacing: .02em; }
	@media (max-width: 680px) {
		.palette-head {
			grid-template-columns: 1fr;
			gap: 12px;
			align-items: start;
		}
		.palette-title-wrap {
			flex-wrap: wrap;
			gap: 4px 12px;
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
	}
</style>
