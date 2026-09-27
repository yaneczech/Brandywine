<!--
  Modal — the one dialog of the admin.
  Header (title + optional description), body (children), optional footer.
  Closes on Escape, backdrop click and the close button; traps focus.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { IconX } from '@tabler/icons-svelte';
	import * as m from '$lib/paraglide/messages';
	import { focusTrap } from '$lib/actions/focus-trap';
	import { DUR, DUR_FAST, EASE } from './motion';

	let {
		open,
		title,
		description,
		size = 'md',
		onClose,
		initialFocus,
		dismissible = true,
		children,
		footer,
		headerExtra
	}: {
		open: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		onClose: () => void;
		initialFocus?: string;
		dismissible?: boolean;
		children: Snippet;
		footer?: Snippet;
		headerExtra?: Snippet;
	} = $props();

	const id = `modal-${Math.random().toString(36).slice(2, 9)}`;

	function close() {
		if (dismissible) onClose();
	}
</script>

{#if open}
	<div
		class="ui-modal-backdrop"
		role="presentation"
		transition:fade={{ duration: DUR_FAST() }}
		onclick={(e) => { if (e.target === e.currentTarget) close(); }}
	>
		<div
			class="ui-modal size-{size}"
			role="dialog"
			aria-modal="true"
			aria-labelledby="{id}-title"
			aria-describedby={description ? `${id}-desc` : undefined}
			tabindex="-1"
			use:focusTrap={{ onEscape: close, initialFocus }}
			transition:scale={{ duration: DUR(), start: 0.97, easing: EASE, opacity: 0 }}
		>
			<header class="ui-modal-head">
				<div class="ui-modal-titles">
					<h2 id="{id}-title">{title}</h2>
					{#if description}<p id="{id}-desc">{description}</p>{/if}
				</div>
				{#if headerExtra}{@render headerExtra()}{/if}
				{#if dismissible}
					<button type="button" class="ui-modal-close" onclick={close} aria-label={m.common_close()}>
						<IconX size={16} stroke={1.5} />
					</button>
				{/if}
			</header>
			<div class="ui-modal-body">
				{@render children()}
			</div>
			{#if footer}
				<footer class="ui-modal-foot">{@render footer()}</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.ui-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
		background: rgba(20, 20, 20, 0.32);
		-webkit-backdrop-filter: blur(2px);
		backdrop-filter: blur(2px);
	}
	.ui-modal {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-height: min(88vh, 900px);
		background: var(--color-surface);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		outline: none;
	}
	.size-sm { max-width: 400px; }
	.size-md { max-width: 520px; }
	.size-lg { max-width: 680px; }
	.size-xl { max-width: 920px; }

	.ui-modal-head {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		padding: var(--space-5) var(--space-5) 0 var(--space-6);
		flex-shrink: 0;
	}
	.ui-modal-titles { flex: 1; min-width: 0; padding-top: 2px; }
	.ui-modal-head h2 {
		font-size: var(--text-lg);
		font-weight: 500;
		letter-spacing: var(--tracking-snug);
		line-height: var(--leading-snug);
		color: var(--color-text);
	}
	.ui-modal-head p {
		margin-top: 4px;
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
		color: var(--color-muted);
	}
	.ui-modal-close {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--color-muted);
		transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
	}
	.ui-modal-close:hover { background: var(--color-hover); color: var(--color-text); }

	.ui-modal-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: var(--space-5) var(--space-6) var(--space-6);
		font-size: var(--text-base);
		line-height: var(--leading-normal);
		color: var(--color-text-secondary);
	}
	.ui-modal-foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
		flex-shrink: 0;
		padding: var(--space-4) var(--space-6);
		border-top: 1px solid var(--color-border);
		background: var(--color-bg);
	}
	.ui-modal-foot :global(.ui-modal-foot-start) { margin-right: auto; }

	@media (max-width: 600px) {
		.ui-modal-backdrop { align-items: flex-end; padding: 0; }
		.ui-modal { max-width: none; max-height: 92vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
	}
</style>
