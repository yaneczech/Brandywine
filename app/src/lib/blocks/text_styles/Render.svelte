<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import BrandFontFaces from '../_shared/BrandFontFaces.svelte';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());
</script>

<BrandFontFaces fontRows={data.fontRows} fontFileRows={data.fontFileRows} />

{#if data.styleRows.length}
	<div class="text-styles">
		{#each data.styleRows as style (style.id)}
			{@const font = data.fontRows.find(f => f.id === style.fontId)}
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

<style>
	.text-styles { display: flex; flex-direction: column; }
	.ts-row {
		display: flex; align-items: baseline; gap: 16px;
		padding: 12px 0; border-bottom: 1px solid var(--manual-border);
	}
	.ts-row:last-child { border-bottom: none; }
	.ts-preview { min-width: 0; flex: 1; color: var(--manual-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.ts-meta { display: flex; gap: 12px; flex-shrink: 0; color: var(--manual-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
	.ts-font { color: var(--manual-ink); }
</style>
