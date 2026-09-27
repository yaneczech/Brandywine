<!-- Toaster — renders the shared toast queue, bottom-right, newest last. -->
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { IconCircleCheck, IconAlertCircle, IconInfoCircle, IconX } from '@tabler/icons-svelte';
	import * as m from '$lib/paraglide/messages';
	import { toasts, dismiss } from '$lib/ui/toast.svelte';
	import { DUR, EASE } from './motion';
</script>

<div class="ui-toaster" role="region" aria-live="polite" aria-label={m.notifications()}>
	{#each toasts as t (t.id)}
		<div class="ui-toast tone-{t.tone}" role={t.tone === 'error' ? 'alert' : 'status'}
			in:fly={{ y: 8, duration: DUR(), easing: EASE }} out:fly={{ y: 4, duration: DUR() }} animate:flip={{ duration: DUR() }}>
			<span class="ui-toast-icon">
				{#if t.tone === 'success'}<IconCircleCheck size={16} stroke={1.75} />
				{:else if t.tone === 'error'}<IconAlertCircle size={16} stroke={1.75} />
				{:else}<IconInfoCircle size={16} stroke={1.75} />{/if}
			</span>
			<span class="ui-toast-text">
				<span>{t.message}</span>
				{#if t.detail}<small>{t.detail}</small>{/if}
			</span>
			<button type="button" class="ui-toast-close" onclick={() => dismiss(t.id)} aria-label={m.common_close()}>
				<IconX size={13} stroke={1.75} />
			</button>
		</div>
	{/each}
</div>

<style>
	.ui-toaster {
		position: fixed;
		right: var(--space-5);
		bottom: var(--space-5);
		z-index: 200;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-2);
		width: min(380px, calc(100vw - 2 * var(--space-4)));
		pointer-events: none;
	}
	.ui-toast {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		width: 100%;
		padding: 11px 10px 11px 14px;
		border-radius: var(--radius-lg);
		background: #1c1c1b;
		color: #f4f4f2;
		box-shadow: var(--shadow-lg);
		font-size: var(--text-sm);
		line-height: var(--leading-snug);
		pointer-events: auto;
	}
	.ui-toast-icon { display: flex; padding-top: 1px; flex-shrink: 0; }
	.tone-success .ui-toast-icon { color: #7fd1a3; }
	.tone-error .ui-toast-icon { color: #f2998f; }
	.tone-info .ui-toast-icon { color: #a9c4ee; }
	.ui-toast-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
	.ui-toast-text small { color: rgba(244, 244, 242, 0.6); font-size: var(--text-xs); }
	.ui-toast-close {
		display: grid; place-items: center; flex-shrink: 0;
		width: 22px; height: 22px; border: 0; border-radius: var(--radius-sm);
		background: none; color: rgba(244, 244, 242, 0.55);
	}
	.ui-toast-close:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
	@media (max-width: 600px) {
		.ui-toaster { right: 50%; transform: translateX(50%); bottom: var(--space-4); align-items: stretch; }
	}
</style>
