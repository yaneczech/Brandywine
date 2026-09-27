<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, num, set, setStr, setNum } = configFields(() => cfg, (next) => onUpdate(next));

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

<div class="fields">
	<ImageField label={m.be_logo_url()} value={str('logoUrl')} onChoose={() => openPicker('logoUrl')} onChange={(v) => set('logoUrl', v)} />
	<ImageField label={m.be_logo_dark()} hint={m.be_logo_dark_hint()} value={str('logoDarkUrl')} onChoose={() => openPicker('logoDarkUrl')} onChange={(v) => set('logoDarkUrl', v)} />
	<div class="fields-row">
		<label class="field">
			<span>{m.be_clear_space()}</span>
			<input type="number" step={0.1} min={0} max={10} value={num('clearspace', 1)} oninput={e => setNum(e, 'clearspace')} />
		</label>
		<label class="field">
			<span>{m.be_min_size_px()}</span>
			<input type="number" min={1} value={num('minSizePx', 24)} oninput={e => setNum(e, 'minSizePx')} />
		</label>
		<label class="field">
			<span>{m.be_min_size_mm()}</span>
			<input type="number" step={0.5} min={1} value={num('minSizeMm', 10)} oninput={e => setNum(e, 'minSizeMm')} />
		</label>
	</div>
	<label class="field">
		<span>{m.be_usage()}</span>
		<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
	</label>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>
