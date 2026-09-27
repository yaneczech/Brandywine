<!--
  Asset-folder chooser for block editors: shows the selected folder and opens
  the folder tree inline. Folders are fetched once, on first open.
-->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconFolder } from '$lib/icons';
	import FolderPicker, { type FolderPickerItem } from '$lib/components/admin/FolderPicker.svelte';

	const { label, value, emptyLabel = m.be_no_folder(), includeRoot = false, rootLabel, onChange }: {
		label: string;
		/** Selected folder id, '' for none */
		value: string;
		/** Shown when nothing is selected */
		emptyLabel?: string;
		/** Offer the root ("all folders") as a choice */
		includeRoot?: boolean;
		rootLabel?: string;
		onChange: (folderId: string) => void;
	} = $props();

	let open = $state(false);
	let loading = $state(false);
	let folders = $state<FolderPickerItem[] | null>(null);

	async function toggle() {
		open = !open;
		if (folders || loading) return;
		loading = true;
		try {
			const r = await fetch('/api/folders');
			if (r.ok) folders = await r.json();
		} finally {
			loading = false;
		}
	}

	function folderLabel(id: string): string {
		if (!id) return emptyLabel;
		return folders?.find((f) => f.id === id)?.name ?? id.slice(0, 8) + '…';
	}
</script>

<div class="field">
	<span>{label}</span>
	<div class="folder-field">
		<div class="folder-selected">
			<IconFolder size={14} />
			<span class={value ? '' : 'muted'}>{value ? folderLabel(value) : emptyLabel}</span>
			<button type="button" class="btn-pick" onclick={toggle}>
				{loading && open ? '…' : open ? m.common_close() : m.be_choose()}
			</button>
		</div>
		{#if open}
			<div class="folder-panel">
				<FolderPicker
					folders={folders ?? []}
					selectedId={value || null}
					{includeRoot}
					{rootLabel}
					showCounts={true}
					onPick={(id) => { onChange(id ?? ''); open = false; }}
				/>
			</div>
		{/if}
	</div>
</div>
