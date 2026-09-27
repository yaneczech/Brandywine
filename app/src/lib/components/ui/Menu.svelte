<!--
  Menu — dropdown of actions anchored to a trigger.
  <Menu label="Export">{#snippet trigger(props)}<button {...props}>…</button>{/snippet}
    {#snippet items(close)}<button class="ui-menu-item" onclick={…}>…</button>{/snippet}</Menu>
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import { DUR_FAST, EASE } from './motion';

	type TriggerProps = { 'aria-haspopup': 'menu'; 'aria-expanded': boolean; onclick: () => void };

	let {
		label,
		align = 'end',
		width = 200,
		trigger,
		items
	}: {
		label: string;
		align?: 'start' | 'end';
		width?: number;
		trigger: Snippet<[TriggerProps]>;
		items: Snippet<[() => void]>;
	} = $props();

	let open = $state(false);
	let root = $state<HTMLElement | null>(null);
	let menuEl = $state<HTMLElement | null>(null);

	function close() { open = false; }
	function toggle() { open = !open; }

	$effect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => { if (root && !root.contains(e.target as Node)) close(); };
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { close(); (root?.querySelector('[aria-haspopup]') as HTMLElement | null)?.focus(); return; }
			if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
			e.preventDefault();
			const els = Array.from(menuEl?.querySelectorAll<HTMLElement>('.ui-menu-item:not(:disabled)') ?? []);
			const i = els.indexOf(document.activeElement as HTMLElement);
			const n = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length;
			els[n]?.focus();
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		queueMicrotask(() => menuEl?.querySelector<HTMLElement>('.ui-menu-item')?.focus());
		return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
	});
</script>

<div class="ui-menu-root" bind:this={root}>
	{@render trigger({ 'aria-haspopup': 'menu', 'aria-expanded': open, onclick: toggle })}
	{#if open}
		<div class="ui-menu align-{align}" role="menu" aria-label={label} bind:this={menuEl} style="min-width:{width}px"
			transition:fly={{ y: -4, duration: DUR_FAST(), easing: EASE }}>
			{@render items(close)}
		</div>
	{/if}
</div>

<style>
	.ui-menu-root { position: relative; display: inline-flex; }
	.ui-menu {
		position: absolute;
		top: calc(100% + 6px);
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 4px;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-lg);
	}
	.align-end { right: 0; }
	.align-start { left: 0; }
	.ui-menu :global(.ui-menu-item) {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 32px;
		padding: 0 8px;
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--color-text);
		font-size: var(--text-sm);
		text-align: left;
		text-decoration: none;
		white-space: nowrap;
		outline: none;
	}
	.ui-menu :global(.ui-menu-item svg) { color: var(--color-muted); flex-shrink: 0; }
	.ui-menu :global(.ui-menu-item:hover), .ui-menu :global(.ui-menu-item:focus-visible) { background: var(--color-hover); }
	.ui-menu :global(.ui-menu-item.danger) { color: var(--color-danger); }
	.ui-menu :global(.ui-menu-item.danger svg) { color: currentColor; }
	.ui-menu :global(.ui-menu-sep) { height: 1px; margin: 4px -4px; background: var(--color-border); }
	.ui-menu :global(.ui-menu-hint) { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--color-muted); }
</style>
