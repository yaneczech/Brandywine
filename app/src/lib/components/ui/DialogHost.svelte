<!-- DialogHost — renders ask() / askText() requests from $lib/ui/dialog. -->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import Modal from './Modal.svelte';
	import { dialogState, settle } from '$lib/ui/dialog.svelte';

	let text = $state('');
	const cur = $derived(dialogState.current);

	$effect(() => {
		if (cur?.kind === 'text') text = cur.opts.initial ?? '';
	});

	function confirmText() {
		if (text.trim()) settle(text.trim());
	}
</script>

{#if cur}
	<Modal
		open={true}
		title={cur.opts.title}
		description={cur.opts.description}
		size="sm"
		onClose={() => settle(cur.kind === 'confirm' ? false : null)}
		initialFocus={cur.kind === 'text' ? 'input' : '.ui-dialog-cancel'}
	>
		{#if cur.kind === 'text'}
			<label class="field">
				{#if cur.opts.label}<span>{cur.opts.label}</span>{/if}
				<input class="input" bind:value={text} placeholder={cur.opts.placeholder}
					onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmText(); } }} />
			</label>
		{/if}
		{#snippet footer()}
			<button type="button" class="btn btn-secondary ui-dialog-cancel" onclick={() => settle(cur.kind === 'confirm' ? false : null)}>
				{m.common_cancel()}
			</button>
			<button
				type="button"
				class="btn {cur.opts.tone === 'danger' ? 'btn-danger' : 'btn-primary'}"
				disabled={cur.kind === 'text' && !text.trim()}
				onclick={() => (cur.kind === 'confirm' ? settle(true) : confirmText())}
			>
				{cur.opts.confirmLabel ?? (cur.opts.tone === 'danger' ? m.common_delete() : m.common_confirm())}
			</button>
		{/snippet}
	</Modal>
{/if}
