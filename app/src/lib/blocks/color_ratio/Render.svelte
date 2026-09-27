<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { contrastOnColor } from '../_shared/color';
	import { configList } from '../_shared/config';

	const { block, data }: BlockRenderProps = $props();

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const ratioItems = $derived(
		list<{ colorId?: string; hex?: string; label?: string; percent: number }>('items')
			.map((item) => {
				const color = data.colorRows.find((c) => c.id === item.colorId);
				const hex = color?.hex ?? (typeof item.hex === 'string' && /^#[0-9a-f]{6}$/i.test(item.hex) ? item.hex : null);
				return hex ? { hex, label: item.label || color?.name || hex.toUpperCase(), percent: Math.max(0, Number(item.percent) || 0) } : null;
			})
			.filter((item): item is { hex: string; label: string; percent: number } => !!item && item.percent > 0)
	);
	const ratioTotal = $derived(ratioItems.reduce((sum, item) => sum + item.percent, 0) || 1);
</script>

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

<style>
	.ratio-block { display: flex; flex-direction: column; gap: 16px; }
	.ratio-bar { display: flex; height: clamp(120px, 18vw, 180px); overflow: hidden; border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 7%, transparent); }
	.ratio-bar span { position: relative; display: flex; align-items: flex-end; min-width: 6px; padding: 12px 12px; overflow: hidden; }
	.ratio-bar em { font-style: normal; font-family: var(--manual-mono); font-size: var(--text-xs); font-variant-numeric: tabular-nums; white-space: nowrap; }
	.ratio-legend { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; padding: 0; list-style: none; font-size: var(--text-sm); color: var(--manual-ink); }
	.ratio-legend li { display: inline-flex; align-items: center; gap: 8px; }
	.ratio-legend strong { color: var(--manual-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
	.ratio-dot { width: 10px; height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--manual-ink) 12%, transparent); }
</style>
