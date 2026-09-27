<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { IconArrowsHorizontal } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	let sliderValue = $state(50);
</script>

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

<style>
	.ba-wrap { display: flex; flex-direction: column; gap: 8px; }
	.ba-slider {
		position: relative; overflow: hidden; border-radius: var(--manual-radius);
		aspect-ratio: 16/9; user-select: none;
		background: var(--manual-stage);
	}
	.ba-before, .ba-after {
		position: absolute; inset: 0;
	}
	.ba-before { clip-path: inset(0 calc(100% - var(--split)) 0 0); }
	.ba-after { clip-path: inset(0 0 0 var(--split)); }
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
		position: absolute; bottom: 12px; padding: 3px 8px; border-radius: min(var(--manual-control-radius), 4px);
		background: rgba(0,0,0,.62); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
		color: #fff; font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase;
	}
	.ba-label-before { left: 10px; }
	.ba-label-after { right: 10px; }
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
</style>
