<!--
  Tabs — underline (page sections) or segmented (compact switches).
  Roving tabindex + arrow keys, per WAI-ARIA tabs pattern.
-->
<script lang="ts" generics="T extends string">
	import type { IconComponent } from './types';

	type Item = { id: T; label: string; count?: number | null; icon?: IconComponent };

	let {
		items,
		value = $bindable(),
		variant = 'underline',
		label,
		size = 'md',
		onChange
	}: {
		items: Item[];
		value: T;
		variant?: 'underline' | 'segmented';
		label: string;
		size?: 'sm' | 'md';
		onChange?: (id: T) => void;
	} = $props();

	let listEl = $state<HTMLElement | null>(null);

	function select(id: T) {
		value = id;
		onChange?.(id);
	}

	function onKeydown(e: KeyboardEvent) {
		const i = items.findIndex((it) => it.id === value);
		let next = -1;
		if (e.key === 'ArrowRight') next = (i + 1) % items.length;
		else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = items.length - 1;
		if (next < 0) return;
		e.preventDefault();
		select(items[next].id);
		listEl?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
	}
</script>

<div class="ui-tabs {variant} size-{size}" role="tablist" aria-label={label} bind:this={listEl} tabindex="-1" onkeydown={onKeydown}>
	{#each items as item (item.id)}
		{@const active = item.id === value}
		<button
			type="button"
			role="tab"
			class="ui-tab"
			class:active
			aria-selected={active}
			tabindex={active ? 0 : -1}
			onclick={() => select(item.id)}
		>
			{#if item.icon}<item.icon size={15} stroke={1.5} />{/if}
			<span>{item.label}</span>
			{#if item.count != null}<span class="ui-tab-count">{item.count}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.ui-tabs { display: flex; min-width: 0; overflow-x: auto; scrollbar-width: none; outline: none; }
	.ui-tabs::-webkit-scrollbar { display: none; }
	.ui-tab {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		border: 0;
		background: none;
		font-size: var(--text-sm);
		font-weight: 400;
		letter-spacing: var(--tracking-snug);
		color: var(--color-muted);
		white-space: nowrap;
		transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
	}
	.ui-tab :global(svg) { flex-shrink: 0; }
	.ui-tab:hover { color: var(--color-text); }
	.ui-tab.active { color: var(--color-text); font-weight: 500; }
	.ui-tab-count { font-size: var(--text-xs); font-weight: 400; color: var(--color-placeholder); font-variant-numeric: tabular-nums; }
	.ui-tab.active .ui-tab-count { color: var(--color-muted); }

	/* underline */
	.underline { gap: var(--space-5); border-bottom: 1px solid var(--color-border); }
	.underline .ui-tab { position: relative; padding: 8px 0; margin-bottom: -4px; border-bottom: 2px solid transparent; }
	.underline .ui-tab.active { border-bottom-color: var(--color-accent); }
	.underline.size-sm .ui-tab { padding: 8px 0; font-size: var(--text-xs); }

	/* segmented */
	.segmented {
		display: inline-flex;
		gap: 4px;
		padding: 4px;
		border-radius: var(--radius);
		background: var(--color-surface-raised);
		box-shadow: inset 0 0 0 1px var(--color-border);
		max-width: 100%;
	}
	.segmented .ui-tab { height: 28px; padding: 0 8px; border-radius: calc(var(--radius) - 2px); }
	.segmented.size-sm .ui-tab { height: 24px; padding: 0 8px; font-size: var(--text-xs); }
	.segmented .ui-tab.active { background: var(--color-surface); box-shadow: var(--shadow-sm), 0 0 0 1px var(--color-border); }
	.ui-tab:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: -2px; border-radius: var(--radius-sm); }
</style>
