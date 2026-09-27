<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { markdownFallback } from '../_shared/content';

	const { block }: BlockRenderProps = $props();
</script>

{#if block.config.markdown}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- markdownFallback() escapes input before adding paragraph markup. -->
	<div class="prose">{@html markdownFallback(block.config.markdown)}</div>
{/if}
