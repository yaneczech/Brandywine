<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetDownload, formatBytes, assetsMatching } from '../_shared/assets';
	import { IconDownload } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const assetsForBlock = (config: Record<string, unknown>, imagesOnly = false, requireFolder = false) =>
		assetsMatching(data.assetRows, config, imagesOnly, requireFolder);

	const downloadAssets = $derived(assetsForBlock(block.config));
</script>

{#if block.config.description}<p class="block-text download-description">{block.config.description}</p>{/if}
{#if downloadAssets.length}
	<div class="download-list">
		{#each downloadAssets as asset (asset.id)}
			<a class="download-row" href={assetDownload(asset)} download={asset.filename}>
				<span><strong>{asset.filename}</strong><small>{asset.mime} · {formatBytes(asset.size)}</small></span>
				<IconDownload size={17} stroke={1.8} />
			</a>
		{/each}
	</div>
{:else}
	<div class="muted-block"><span class="placeholder-copy">{t.noFiles}</span></div>
{/if}

<style>
	.download-row { display:flex; align-items:center; gap: 16px; min-width:0; padding: 12px 0; border-bottom:1px solid var(--manual-border); color:var(--manual-ink); text-decoration:none; transition:color .15s ease; }
	.download-row :global(svg) { color:var(--manual-muted); transition:color .15s ease, transform .2s var(--manual-ease); }
	.download-row:hover :global(svg) { color:var(--manual-ink); transform:translateY(1px); }
	.download-row > span { display:flex; flex:1; min-width:0; flex-direction:column; gap: 4px; }
	.download-row strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size: var(--text-md); font-weight: 500; }
	.download-row small { color:var(--manual-muted); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
	.download-list { display:flex; flex-direction:column; border-top:1px solid var(--manual-border); }
	.download-description { margin: 0 0 12px; }
</style>
