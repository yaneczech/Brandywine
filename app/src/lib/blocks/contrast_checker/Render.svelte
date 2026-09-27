<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { wcagContrast } from '../_shared/color';
	import { configString } from '../_shared/config';
	import { IconArrowsHorizontal } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	// svelte-ignore state_referenced_locally
	let contrastFg = $state(typeof block.config.foreground === 'string' ? block.config.foreground : (data.colorRows[0]?.hex ?? '#171717'));
	// svelte-ignore state_referenced_locally
	let contrastBg = $state(typeof block.config.background === 'string' ? block.config.background : '#ffffff');

	const fg = $derived(/^#[0-9a-f]{6}$/i.test(contrastFg) ? contrastFg : '#171717');
	const bg = $derived(/^#[0-9a-f]{6}$/i.test(contrastBg) ? contrastBg : '#ffffff');
	const ratio = $derived(wcagContrast(fg, bg));
	const paletteForChecker = $derived(data.colorRows.length ? data.colorRows : []);
</script>

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

<style>
	.cc-block {
		display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 0 clamp(1.5rem, 3vw, 2.5rem);
	}
	.cc-preview { grid-row: span 2; display: flex; flex-direction: column; justify-content: center; gap: 12px; min-height: 300px; padding: clamp(1.25rem, 4%, 2.5rem); border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); transition: background .2s ease, color .2s ease; }
	.cc-big { font-size: clamp(3.5rem, 8vw, 6rem); font-weight: 500; line-height: 1; letter-spacing: var(--tracking-display); }
	.cc-sample { max-width: 32ch; font-size: var(--text-lg); line-height: 1.5; }
	.cc-controls { display: flex; flex-direction: column; gap: 16px; padding: 0 0 20px; border-bottom: 1px solid var(--manual-border); }
	.cc-field { display: flex; flex-direction: column; gap: 8px; }
	.cc-label { font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; color: var(--manual-muted); }
	.cc-input { display: flex; align-items: center; gap: 8px; }
	.cc-input input[type="color"] { width: 36px; height: 36px; padding: 0; border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius); background: none; cursor: pointer; }
	.cc-input input[type="text"] {
		flex: 1; min-width: 0; height: 36px; padding: 0 12px; border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius);
		background: transparent; color: var(--manual-ink); font-family: var(--manual-mono, monospace); font-size: var(--text-sm);
		transition: border-color .15s ease;
	}
	.cc-input input[type="text"]:hover { border-color: var(--manual-border-strong); }
	.cc-swatches { display: flex; flex-wrap: wrap; gap: 8px; }
	.cc-swatch { width: 24px; height: 24px; padding: 0; border: 0; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 14%, transparent); border-radius: 50%; cursor: pointer; }
	.cc-swatch.active { outline: 1px solid var(--manual-ink); outline-offset: 2px; }
	.cc-swap {
		display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; height: 32px; padding: 0 12px;
		border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius); background: transparent; color: var(--manual-ink);
		font-family: inherit; font-size: var(--text-sm); font-weight: 500; cursor: pointer;
		transition: border-color .15s ease;
	}
	.cc-swap:hover { border-color: var(--manual-border-strong); }
	.cc-results { display: flex; flex-direction: column; padding: 16px 0 0; }
	.cc-ratio { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; font-size: var(--text-sm); color: var(--manual-muted); }
	.cc-ratio strong { color: var(--manual-ink); font-size: var(--text-3xl); font-weight: 500; letter-spacing: var(--tracking-tight); font-variant-numeric: tabular-nums; }
	.cc-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 8px 0; border-top: 1px solid var(--manual-border); font-size: var(--text-sm); color: var(--manual-ink); }
	.cc-row em { color: var(--manual-ink); font-size: var(--text-xs); font-style: normal; font-weight: 500; letter-spacing: .04em; font-variant-numeric: tabular-nums; }
	.cc-row.fail em { color: var(--manual-danger); }
	@container manual-blocks (max-width: 640px) {
		.cc-block { grid-template-columns: minmax(0, 1fr); }
		.cc-preview { grid-row: auto; min-height: 200px; }
	}
</style>
