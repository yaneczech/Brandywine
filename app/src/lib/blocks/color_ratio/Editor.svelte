<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';

	const { cfg, onUpdate, brandColors }: BlockEditorProps = $props();

	type RatioItem = { colorId: string; percent: number };

	// svelte-ignore state_referenced_locally
	let ratioItems = $state<RatioItem[]>(configArray<RatioItem>(cfg, 'items'));
	function updateRatio(items: RatioItem[]) {
		ratioItems = items;
		onUpdate({ ...cfg, items: items });
	}
	const ratioTotal = $derived(ratioItems.reduce((sum, i) => sum + (Number(i.percent) || 0), 0));
</script>

<div class="list-editor">
	{#if !brandColors.length}
		<p class="muted" style="font-size:.85rem">{m.be_need_colors()}</p>
	{/if}
	{#each ratioItems as item, i (i)}
		{@const c = brandColors.find(b => b.id === item.colorId)}
		<div class="ratio-row">
			<span class="ratio-swatch" style="background:{c?.hex ?? 'transparent'}"></span>
			<select value={item.colorId} onchange={e => updateRatio(ratioItems.map((x, j) => j === i ? { ...x, colorId: (e.target as HTMLSelectElement).value } : x))}>
				{#each brandColors as bc (bc.id)}<option value={bc.id}>{bc.name} · {bc.hex}</option>{/each}
			</select>
			<input type="number" min="0" max="100" value={item.percent}
				oninput={e => updateRatio(ratioItems.map((x, j) => j === i ? { ...x, percent: Number((e.target as HTMLInputElement).value) } : x))} />
			<span class="muted">%</span>
			<button class="btn-ghost sm danger" onclick={() => updateRatio(ratioItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
		</div>
	{/each}
	{#if ratioItems.length}
		<small class="ratio-total" class:warn={ratioTotal !== 100}>{m.be_ratio_total({ total: String(ratioTotal) })}{ratioTotal !== 100 ? m.be_ratio_normalised() : ''}</small>
	{/if}
	{#if brandColors.length}
		<button class="btn-add" onclick={() => updateRatio([...ratioItems, { colorId: brandColors[ratioItems.length % brandColors.length].id, percent: 10 }])}>{m.be_add_color()}</button>
	{/if}
</div>

<style>
	.ratio-row { display: flex; align-items: center; gap: 8px; }
	.ratio-row select { flex: 1; min-width: 0; }
	.ratio-row input { width: 72px; }
	.ratio-swatch { width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; border: 1px solid var(--color-border); }
	.ratio-total { font-size: var(--text-xs); color: var(--color-success); }
	.ratio-total.warn { color: var(--color-warning); }
</style>
