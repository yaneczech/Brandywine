<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetPreview, isPhoto, assetDownload, formatBytes, assetsMatching } from '../_shared/assets';
	import { IconDownload } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const assetsForBlock = (config: Record<string, unknown>, imagesOnly = false, requireFolder = false) =>
		assetsMatching(data.assetRows, config, imagesOnly, requireFolder);

	const galleryAssets = $derived(assetsForBlock(block.config));
</script>

{#if galleryAssets.length}
	<div class="asset-gallery" class:list={block.config.layout === 'list'}>
		{#each galleryAssets as asset (asset.id)}
			<a class="asset-public-card" href={assetDownload(asset)} download={asset.filename}>
				<div class="asset-public-preview" class:graphic={!isPhoto(asset)}>
					{#if assetPreview(asset)}<img src={assetPreview(asset)} alt="" loading="lazy" decoding="async" />{:else}<span>{asset.filename.split('.').pop()?.toUpperCase()}</span>{/if}
				</div>
				<div><strong>{asset.filename}</strong><span>{formatBytes(asset.size)}</span></div>
				<IconDownload size={16} stroke={1.8} />
			</a>
		{/each}
	</div>
{:else}
	<div class="muted-block"><span class="placeholder-copy">{t.noAssets}</span></div>
{/if}

<style>
	.asset-public-preview.graphic {
		--chk: color-mix(in srgb, var(--manual-ink) 3.5%, transparent);
		background-color: var(--manual-stage);
		background-image:
		linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%),
		linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%);
		background-size: 16px 16px;
		background-position: 0 0, 8px 8px;
	}
	.asset-gallery { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); column-gap: 32px; border-top:1px solid var(--manual-border); }
	.asset-gallery.list { grid-template-columns:1fr; }
	.asset-public-card { display:flex; align-items:center; gap: 16px; min-width:0; padding: 12px 0; border-bottom:1px solid var(--manual-border); color:var(--manual-ink); text-decoration:none; transition:color .15s ease; }
	.asset-public-card :global(svg) { color:var(--manual-muted); transition:color .15s ease, transform .2s var(--manual-ease); }
	.asset-public-card:hover :global(svg) { color:var(--manual-ink); transform:translateY(1px); }
	.asset-public-preview { display:flex; align-items:center; justify-content:center; width:48px; height:40px; flex:0 0 auto; overflow:hidden; border-radius:calc(var(--manual-radius) * .6); background:var(--manual-stage); color:var(--manual-muted); font-size: var(--text-2xs); font-weight: 500; }
	.asset-public-preview img { width:100%; height:100%; object-fit:cover; }
	.asset-public-preview.graphic img { object-fit:contain; padding: 8px; }
	.asset-public-card > div:nth-child(2) { display:flex; flex:1; min-width:0; flex-direction:column; gap: 4px; }
	.asset-public-card strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size: var(--text-md); font-weight: 500; }
	.asset-public-card span { color:var(--manual-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
</style>
