<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetPreview, assetDownload, assetsMatching } from '../_shared/assets';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const assetsForBlock = (config: Record<string, unknown>, imagesOnly = false, requireFolder = false) =>
		assetsMatching(data.assetRows, config, imagesOnly, requireFolder);

	const iconAssets = $derived(assetsForBlock(block.config, true, true));
</script>

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

<style>
	.block-text + .icon-gallery { margin-top: 16px; }
	.icon-gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(112px,1fr)); gap: 20px 12px; }
	.icon-card { display:flex; min-width:0; flex-direction:column; align-items:stretch; gap: 8px; color:var(--manual-ink); text-decoration:none; }
	.icon-card img { box-sizing:content-box; padding: calc((88px - var(--icon-size)) / 2) 0; width:100%; background:var(--manual-stage); border-radius:var(--manual-radius); transition:background .2s ease; }
	.icon-card:hover img { background:color-mix(in srgb, var(--manual-ink) 6%, var(--manual-paper)); }
	.icon-card img { height:var(--icon-size); object-fit:contain; }
	.icon-card span { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--manual-muted); font-size: var(--text-xs); }
</style>
