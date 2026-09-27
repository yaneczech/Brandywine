<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { richContent } from '../_shared/content';
	import { IconCancel, IconExclamationCircle } from '$lib/icons';

	const { block }: BlockRenderProps = $props();
</script>

{#if richContent(block.config).length}
	<div class="rich-flow">
		{#each richContent(block.config) as item, itemIndex (itemIndex)}
			{#if item.type === 'text'}
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
				<div class="prose">{@html item.html}</div>
			{:else}
				<div class="content-callout" class:is-alert={item.type === 'alert'}>
					<div class="content-callout-icon" aria-hidden="true">
						{#if item.type === 'alert'}<IconCancel size={18} stroke={1.9} />{:else}<IconExclamationCircle size={18} stroke={1.9} />{/if}
					</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
				<div class="content-callout-body">{@html item.html}</div>
				</div>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.rich-flow { display: flex; flex-direction: column; gap: 16px; }
	.content-callout {
		display: grid; grid-template-columns: 16px minmax(0,1fr); gap: 12px;
		--tone: var(--manual-warning);
		max-width: 72ch;
		padding: 12px 14px;
		border-radius: var(--manual-control-radius);
		background: color-mix(in srgb, var(--tone) 7%, var(--manual-paper));
		color: var(--manual-ink);
	}
	.content-callout.is-alert { --tone: var(--manual-danger); }
	.content-callout-icon { width: 16px; height: 1.65em; display: grid; place-items: center; color: var(--tone); }
	.content-callout-icon :global(svg) { width: 15px; height: 15px; }
	.content-callout-body { font-size: var(--text-md); line-height: 1.65; }
	.content-callout-body :global(p) { margin: 0 0 12px; }
	.content-callout-body :global(p:last-child) { margin-bottom: 0; }
</style>
