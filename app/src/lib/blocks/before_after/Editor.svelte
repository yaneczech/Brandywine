<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, set, setStr } = configFields(() => cfg, (next) => onUpdate(next));

	// Asset picker: which config key receives the chosen file
	let pickerOpen = $state(false);
	let pickerTarget = $state('url');
	let pickerMime = $state<'image' | 'all'>('image');
	function openPicker(targetKey: string, mime: 'image' | 'all' = 'image') {
		pickerTarget = targetKey;
		pickerMime = mime;
		pickerOpen = true;
	}
	function onAssetPick(url: string) {
		set(pickerTarget, url);
		pickerOpen = false;
	}
</script>

<div class="fields fields-row">
	<div class="fields col">
		<ImageField label={m.be_before_url()} value={str('beforeUrl')} onChoose={() => openPicker('beforeUrl')} onChange={(v) => set('beforeUrl', v)} />
		<label class="field"><span>{m.be_before_label()}</span>
			<input type="text" value={str('beforeLabel')} placeholder={m.be_wrong()} oninput={e => setStr(e, 'beforeLabel')} /></label>
	</div>
	<div class="fields col">
		<ImageField label={m.be_after_url()} value={str('afterUrl')} onChoose={() => openPicker('afterUrl')} onChange={(v) => set('afterUrl', v)} />
		<label class="field"><span>{m.be_after_label()}</span>
			<input type="text" value={str('afterLabel')} placeholder={m.be_right()} oninput={e => setStr(e, 'afterLabel')} /></label>
	</div>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
	.col { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
</style>
