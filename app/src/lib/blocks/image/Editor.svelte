<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, bool, set, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));

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
	<ImageField label={m.be_image_url()} value={str('url')} onChoose={() => openPicker('url')} onChange={(v) => set('url', v)} />
	<div class="fields-row">
		<label class="field">
			<span>{m.be_alt()}</span>
			<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
		</label>
		<label class="field">
			<span>{m.be_caption()} <span class="muted">{m.be_caption_hint()}</span></span>
			<input type="text" value={str('caption')} placeholder={m.be_caption_placeholder()} oninput={e => setStr(e, 'caption')} />
		</label>
	</div>
	<div class="fields-row">
		<label class="field checkbox">
			<input type="checkbox" checked={bool('fullWidth')} onchange={e => setBool(e, 'fullWidth')} />
			<span>{m.be_full_width()}</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('frame')} onchange={e => setBool(e, 'frame')} />
			<span>{m.be_background()}</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('zoom', true)} onchange={e => setBool(e, 'zoom')} />
			<span>{m.be_zoom()}</span>
		</label>
	</div>
	{#if bool('frame')}
		<div class="fields-row frame-opts">
			<label class="field">
				<span>{m.be_bg_color()}</span>
				<div class="color-row">
					<input type="color" value={str('frameBg') || '#ffffff'} oninput={e => setStr(e, 'frameBg')} class="color-swatch" />
					<input type="text" value={str('frameBg') || '#ffffff'} placeholder="#ffffff" oninput={e => setStr(e, 'frameBg')} class="color-text" />
				</div>
			</label>
			<label class="field">
				<span>{m.be_border_color()} <span class="muted">{m.be_border_hint()}</span></span>
				<div class="color-row">
					<input type="color" value={str('frameBorderColor') || '#e5e5e5'} oninput={e => setStr(e, 'frameBorderColor')} class="color-swatch" />
					<input type="text" value={str('frameBorderColor')} placeholder={m.be_no_border()} oninput={e => setStr(e, 'frameBorderColor')} class="color-text" />
				</div>
			</label>
		</div>
	{/if}
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
	.frame-opts { align-items: flex-start; }
</style>
