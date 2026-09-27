<!-- EmptyState — a quiet, typographic "nothing here yet" with an optional action. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { IconComponent } from './types';

	let {
		icon,
		title,
		description,
		compact = false,
		action
	}: {
		icon?: IconComponent;
		title: string;
		description?: string;
		compact?: boolean;
		action?: Snippet;
	} = $props();
</script>

<div class="ui-empty" class:compact>
	{#if icon}
		{@const Icon = icon}
		<span class="ui-empty-icon"><Icon size={compact ? 18 : 22} stroke={1.25} /></span>
	{/if}
	<p class="ui-empty-title">{title}</p>
	{#if description}<p class="ui-empty-desc">{description}</p>{/if}
	{#if action}<div class="ui-empty-action">{@render action()}</div>{/if}
</div>

<style>
	.ui-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-16) var(--space-6);
		border: 1px dashed var(--color-border-strong);
		border-radius: var(--radius-lg);
	}
	.ui-empty.compact { padding: var(--space-8) var(--space-5); }
	.ui-empty-icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin-bottom: var(--space-4);
		border-radius: 50%;
		background: var(--color-surface);
		box-shadow: 0 0 0 1px var(--color-border), var(--shadow-xs);
		color: var(--color-muted);
	}
	.compact .ui-empty-icon { width: 36px; height: 36px; margin-bottom: var(--space-3); }
	.ui-empty-title {
		font-size: var(--text-md);
		font-weight: 500;
		letter-spacing: var(--tracking-snug);
		color: var(--color-text);
	}
	.ui-empty-desc {
		max-width: 42ch;
		margin-top: 6px;
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
		color: var(--color-muted);
	}
	.ui-empty-action { margin-top: var(--space-5); }
</style>
