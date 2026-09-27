<!--
  Renders one manual block: looks its type up in the block registry
  (src/lib/blocks) and wraps the block's Render component in the standard
  shell — heading, intro, callout and anchor link.
-->
<script lang="ts">
	import ManualBlockShell from './ManualBlockShell.svelte';
	import { getBlockDefinition } from '$lib/blocks';
	import type { AssetRow, Block, BlockData, ColorRow, FontFileRow, FontRow, PaletteRow, StyleRow } from '$lib/blocks';
	import { slugify } from '$lib/blocks/_shared/config';
	import '$lib/blocks/_shared/block-styles.css';

	const {
		block,
		colorRows    = [],
		paletteRows  = [],
		fontRows     = [],
		styleRows    = [],
		fontFileRows = [],
		assetRows    = [],
		sectionNumber = null,
		html,
	}: {
		block: Block;
		colorRows?: ColorRow[];
		paletteRows?: PaletteRow[];
		fontRows?: FontRow[];
		styleRows?: StyleRow[];
		fontFileRows?: FontFileRow[];
		assetRows?: AssetRow[];
		/** Chapter number for this block's heading (e.g. 1.2.3), when numbering is on */
		sectionNumber?: string | null;
		/** Server-rendered HTML, for blocks of runtime plugins */
		html?: string;
	} = $props();

	const definition = $derived(getBlockDefinition(block.type));
	const anchorId = $derived(block.anchor ?? (block.config.heading ? slugify(String(block.config.heading)) : undefined));
	const data: BlockData = $derived({ colorRows, paletteRows, fontRows, styleRows, fontFileRows, assetRows });
</script>

{#if !block.enabled}
	<!-- hidden -->
{:else if definition && definition.shell === false}
	<definition.Render {block} {data} {anchorId} {html} />
{:else}
	<ManualBlockShell id={anchorId} type={block.type} config={block.config} number={sectionNumber}>
		{#if definition}
			<definition.Render {block} {data} {html} />
		{:else}
			<!-- Unknown type, e.g. a block from a removed plugin -->
			<div class="muted-block">
				<span class="block-type-label">{block.type}</span>
			</div>
		{/if}
	</ManualBlockShell>
{/if}
