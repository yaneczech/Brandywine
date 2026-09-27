<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { IconCheck, IconX } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());
</script>

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

<style>
	.do-dont-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 32px 20px; }
	.do-dont-item { display: flex; flex-direction: column; gap: 16px; font-size: var(--text-md); line-height: 1.55; }
	.do-dont-item:not(:has(.dd-media)) { padding-top: 16px; border-top: 1px solid var(--manual-border); }
	.do-dont-item.is-dont:not(:has(.dd-media)) { border-top-color: var(--manual-danger); }
	.dd-body { padding: 0; }
	.dd-media { position: relative; margin: 0; aspect-ratio: 4/3; background: #fff; border-radius: var(--manual-radius); box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent); overflow: hidden; }
	.dd-media img { width: 100%; height: 100%; object-fit: contain; padding: 10%; }
	.dd-strike { position: absolute; inset: 0; background: linear-gradient(to top right, transparent calc(50% - 1px), var(--manual-danger) calc(50% - .5px), var(--manual-danger) calc(50% + .5px), transparent calc(50% + 1px)); pointer-events: none; }
	.do-dont-item p { margin: 0; }
	.do-dont-badge {
		display: inline-flex; align-items: center; gap: 4px; margin-bottom: 8px;
		color: var(--manual-ink); font-size: var(--manual-label-size); font-weight: 500;
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
	}
	.is-dont .do-dont-badge { color: var(--manual-danger); }
</style>
