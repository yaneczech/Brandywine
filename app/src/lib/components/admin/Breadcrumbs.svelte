<script module lang="ts">
	export type BreadcrumbItem = {
		label: string;
		value?: string | null;
		title?: string;
	};
</script>

<script lang="ts">
	import { IconChevronRight } from '@tabler/icons-svelte';

	let {
		items,
		onSelect
	}: {
		items: BreadcrumbItem[];
		onSelect?: (item: BreadcrumbItem) => void;
	} = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
	<ol>
		{#each items as item, i (`${item.value ?? item.label}-${i}`)}
			{@const isLast = i === items.length - 1}
			<li>
				{#if i > 0}
					<span class="separator" aria-hidden="true">
						<IconChevronRight size={13} stroke={1.75} />
					</span>
				{/if}
				{#if !isLast && onSelect}
					<button type="button" title={item.title ?? item.label} onclick={() => onSelect?.(item)}>
						{item.label}
					</button>
				{:else}
					<span class:current={isLast} title={item.title ?? item.label} aria-current={isLast ? 'page' : undefined}>
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	.breadcrumbs {
		min-width: 0;
		max-width: 100%;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.breadcrumbs::-webkit-scrollbar { display: none; }
	ol {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		white-space: nowrap;
	}
	li {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}
	button,
	span {
		display: inline-flex;
		align-items: center;
		max-width: 22ch;
		overflow: hidden;
		text-overflow: ellipsis;
		border: 0;
		background: none;
		padding: 2px 0;
		color: var(--color-muted);
		font: inherit;
		line-height: 1.35;
	}
	button {
		cursor: pointer;
	}
	button:hover {
		color: var(--color-text);
	}
	.current {
		color: var(--color-text);
		font-weight: 600;
	}
	.separator {
		display: inline-flex;
		align-items: center;
		flex: 0 0 auto;
		color: var(--color-muted);
		opacity: 0.55;
	}

	@media (max-width: 520px) {
		button,
		span {
			max-width: 16ch;
		}
	}
</style>
