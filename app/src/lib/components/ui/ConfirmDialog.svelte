<!-- ConfirmDialog — a Modal for yes/no decisions; danger tone for destructive ones. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import Modal from './Modal.svelte';

	let {
		open,
		title,
		description,
		confirmLabel,
		cancelLabel,
		tone = 'danger',
		busy = false,
		onConfirm,
		onCancel,
		children
	}: {
		open: boolean;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		tone?: 'danger' | 'primary';
		busy?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
		children?: Snippet;
	} = $props();
</script>

<Modal {open} {title} {description} size="sm" onClose={onCancel} dismissible={!busy} initialFocus=".ui-confirm-cancel">
	{#if children}{@render children()}{/if}
	{#snippet footer()}
		<button type="button" class="btn btn-secondary ui-confirm-cancel" onclick={onCancel} disabled={busy}>
			{cancelLabel ?? m.common_cancel()}
		</button>
		<button type="button" class="btn {tone === 'danger' ? 'btn-danger' : 'btn-primary'}" onclick={onConfirm} disabled={busy}>
			{#if busy}<span class="ui-spinner" aria-hidden="true"></span>{/if}
			{confirmLabel ?? (tone === 'danger' ? m.common_delete() : m.common_save())}
		</button>
	{/snippet}
</Modal>
