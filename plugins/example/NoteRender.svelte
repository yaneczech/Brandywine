<script lang="ts">
	import type { BlockRenderProps } from '$lib/blocks/types';
	import { configString } from '$lib/blocks/_shared/config';

	const { block }: BlockRenderProps = $props();
	const text = $derived(configString(block.config, 'text'));
</script>

{#if text}
	<p class="note">{text}</p>
{/if}

<style>
	.note {
		margin: 0;
		padding-left: 16px;
		border-left: 1px solid var(--manual-brand);
		color: var(--manual-ink);
		font-size: var(--text-lg);
		line-height: 1.6;
	}
</style>
