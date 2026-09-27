<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import RichContentEditor from '$lib/components/admin/RichContentEditor.svelte';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { block, cfg, onUpdate }: BlockEditorProps = $props();
	const { str, set, setStr } = configFields(() => cfg, (next) => onUpdate(next));

	function updateRichContent(items: unknown[]) {
		const next = { ...cfg, content: items };
		delete (next as Record<string, unknown>)['markdown'];
		onUpdate(next);
	}

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
	<label class="field">
		<span>{m.be_title()}</span>
		<input type="text" value={str('title')} placeholder={m.be_ti_title_placeholder()} oninput={e => setStr(e, 'title')} />
	</label>
	<div class="field">
		<span>Text</span>
		{#key block.id}
			<RichContentEditor value={cfg['content']} legacyMarkdown={str('markdown')} onChange={updateRichContent} />
		{/key}
	</div>
	<ImageField label={m.be_image()} value={str('imageUrl')} onChoose={() => openPicker('imageUrl')} onChange={(v) => set('imageUrl', v)} />
	<div class="fields-row">
		<label class="field">
			<span>{m.be_alt()}</span>
			<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
		</label>
		<label class="field">
			<span>{m.be_image_position()}</span>
			<select value={str('imagePosition') || 'right'} onchange={e => setStr(e, 'imagePosition')}>
				<option value="right">{m.be_right_side()}</option>
				<option value="left">{m.be_left_side()}</option>
			</select>
		</label>
		<label class="field">
			<span>{m.be_crop()}</span>
			<select value={str('fit') || 'cover'} onchange={e => setStr(e, 'fit')}>
				<option value="cover">{m.be_fill()}</option>
				<option value="contain">{m.be_contain()}</option>
			</select>
		</label>
	</div>
	<div class="fields-row">
		<label class="field">
			<span>{m.be_button_text()} <span class="muted">{m.common_optional()}</span></span>
			<input type="text" value={str('ctaLabel')} placeholder={m.be_button_text_placeholder()} oninput={e => setStr(e, 'ctaLabel')} />
		</label>
		<label class="field">
			<span>{m.be_button_link()}</span>
			<input type="text" value={str('ctaUrl')} placeholder={m.be_button_link_placeholder()} oninput={e => setStr(e, 'ctaUrl')} />
		</label>
	</div>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>
