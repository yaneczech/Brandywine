<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { IconChevronRight } from '$lib/icons';

	const { block }: BlockRenderProps = $props();
</script>

{#if Array.isArray(block.config.items)}
	<div class="accordion">
		{#each block.config.items as item, i (i)}
			<details class="accordion-item">
				<summary class="accordion-q">
					{item.question}
					<IconChevronRight size={16} stroke={2} class="accordion-icon" />
				</summary>
				<div class="accordion-a">{item.answer}</div>
			</details>
		{/each}
	</div>
{/if}

<style>
	.accordion { display: flex; flex-direction: column; border-top: 1px solid var(--manual-border); }
	.accordion-item { border-bottom: 1px solid var(--manual-border); }
	.accordion-q {
		display: flex; align-items: center; justify-content: space-between; gap: 16px;
		padding: 16px 0; color: var(--manual-ink); font-weight: 500; font-size: var(--text-lg); letter-spacing: -.01em;
		cursor: pointer; list-style: none;
		transition: color .15s ease;
	}
	.accordion-q:hover { color: color-mix(in srgb, var(--manual-ink) 72%, transparent); }
	.accordion-q::-webkit-details-marker { display: none; }
	:global(.accordion-icon) { flex-shrink: 0; color: var(--manual-muted); transition: transform .25s var(--manual-ease, ease); }
	details[open] :global(.accordion-icon) { transform: rotate(90deg); }
	.accordion-a { max-width: 68ch; padding: 0 0 20px; color: var(--manual-muted); font-size: var(--text-md); line-height: 1.7; }
</style>
