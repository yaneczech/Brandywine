<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';
	import { IconPhoto } from '$lib/icons';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type DoDontItem = { text: string; type: 'do' | 'dont'; imageUrl?: string };

	// svelte-ignore state_referenced_locally
	let doDontItems = $state<DoDontItem[]>(configArray<DoDontItem>(cfg, 'items'));
	function updateDoDont(newItems: DoDontItem[]) {
		doDontItems = newItems;
		onUpdate({ ...cfg, items: newItems });
	}

	// Asset picker: `dd:<index>` targets the example image of that item
	let pickerOpen = $state(false);
	let pickerTarget = $state('url');
	let pickerMime = $state<'image' | 'all'>('image');
	function openPicker(targetKey: string, mime: 'image' | 'all' = 'image') {
		pickerTarget = targetKey;
		pickerMime = mime;
		pickerOpen = true;
	}
	function onAssetPick(url: string) {
		const idx = Number(pickerTarget.slice(3));
		updateDoDont(doDontItems.map((x, j) => j === idx ? { ...x, imageUrl: url } : x));
		pickerOpen = false;
	}
</script>

<div class="list-editor">
{#each doDontItems as item, i (i)}
		<div class="list-row">
			<select value={item.type}
				onchange={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, type: (e.target as HTMLSelectElement).value as 'do' | 'dont' } : x))}
				style="width:90px;flex-shrink:0">
				<option value="do">✅ Do</option>
				<option value="dont">❌ Don't</option>
			</select>
			<input type="text" value={item.text} placeholder={m.be_desc_placeholder()} style="flex:1"
				oninput={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, text: (e.target as HTMLInputElement).value } : x))} />
			{#if item.imageUrl}
				<button type="button" class="dd-thumb" onclick={() => openPicker(`dd:${i}`)} title={m.be_change_image()}>
					<img src={item.imageUrl} alt="" />
				</button>
				<button class="btn-ghost sm" onclick={() => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, imageUrl: '' } : x))} title={m.be_remove_image()}>⌫</button>
			{:else}
				<button type="button" class="btn-pick" onclick={() => openPicker(`dd:${i}`)} title={m.be_add_image_example()}><IconPhoto size={14} /></button>
			{/if}
			<button class="btn-ghost sm danger" onclick={() => updateDoDont(doDontItems.filter((_, j) => j !== i))}>✕</button>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateDoDont([...doDontItems, { type: 'do', text: '' }])}>{m.be_add_item()}</button>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
	.dd-thumb { width: 36px; height: 36px; flex: 0 0 auto; padding: 2px; border: 1px solid var(--color-border); border-radius: var(--radius); background: #fff; cursor: pointer; }
	.dd-thumb img { width: 100%; height: 100%; object-fit: contain; }
</style>
