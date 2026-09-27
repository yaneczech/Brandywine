<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields, configArray, moveItem } from '../_shared/editor';
	import { IconPhoto } from '$lib/icons';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate, brandColors }: BlockEditorProps = $props();
	const { num, setNum } = configFields(() => cfg, (next) => onUpdate(next));

	type LogoFile = { label: string; url: string };
	type LogoVariant = { label: string; url: string; background: string; files: LogoFile[] };

	// svelte-ignore state_referenced_locally
	let logoVariants = $state<LogoVariant[]>(configArray<LogoVariant>(cfg, 'variants').map((v) => ({ ...v, files: Array.isArray(v.files) ? v.files : [] })));
	function updateVariants(variants: LogoVariant[]) {
		logoVariants = variants;
		onUpdate({ ...cfg, variants: variants });
	}
	function patchVariant(i: number, patch: Partial<LogoVariant>) {
		updateVariants(logoVariants.map((v, j) => j === i ? { ...v, ...patch } : v));
	}

	// Asset picker: `lv:<variant>` targets the variant's preview, `lv:<variant>:<file>` one of its extra files
	let pickerOpen = $state(false);
	let pickerTarget = $state('url');
	let pickerMime = $state<'image' | 'all'>('image');
	function openPicker(targetKey: string, mime: 'image' | 'all' = 'image') {
		pickerTarget = targetKey;
		pickerMime = mime;
		pickerOpen = true;
	}
	function onAssetPick(url: string) {
		const [, vi, fi] = pickerTarget.split(':');
		const v = Number(vi);
		if (fi === undefined) patchVariant(v, { url });
		else patchVariant(v, { files: logoVariants[v].files.map((f, j) => j === Number(fi) ? { ...f, url, label: f.label || (url.split('.').pop() ?? '').toUpperCase() } : f) });
		pickerOpen = false;
	}
</script>

<div class="fields">
	<p class="muted" style="font-size:.82rem;margin:0">{m.be_logo_download_hint()}</p>
	<div class="fields-row">
		<label class="field">
			<span>{m.be_min_height_px()}</span>
			<input type="number" min={1} value={num('minSizePx', 0) || ''} placeholder={m.be_eg_20()} oninput={e => setNum(e, 'minSizePx')} />
		</label>
		<label class="field">
			<span>{m.be_min_height_mm()}</span>
			<input type="number" min={1} value={num('minSizeMm', 0) || ''} placeholder={m.be_eg_15()} oninput={e => setNum(e, 'minSizeMm')} />
		</label>
	</div>
	<div class="list-editor">
		{#each logoVariants as v, i (i)}
			<div class="variant-card">
				<div class="variant-head">
					<input type="text" value={v.label} placeholder={m.be_variant_name()} oninput={e => patchVariant(i, { label: (e.target as HTMLInputElement).value })} />
					<select value={v.background || 'light'} onchange={e => patchVariant(i, { background: (e.target as HTMLSelectElement).value })} aria-label={m.be_preview_bg()}>
						<option value="light">{m.be_light_bg()}</option>
						<option value="dark">{m.be_dark_bg()}</option>
						{#each brandColors as bc (bc.id)}<option value={bc.hex}>{bc.name}</option>{/each}
					</select>
					<button class="btn-ghost sm" onclick={() => updateVariants(moveItem(logoVariants, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
					<button class="btn-ghost sm danger" onclick={() => updateVariants(logoVariants.filter((_, j) => j !== i))} aria-label={m.be_remove_variant()}>✕</button>
				</div>
				<div class="input-with-btn">
					<input type="text" value={v.url} placeholder="/uploads/…logo.svg" oninput={e => patchVariant(i, { url: (e.target as HTMLInputElement).value })} />
					<button type="button" class="btn-pick" onclick={() => openPicker(`lv:${i}`)} title={m.editor_pick_asset()}><IconPhoto size={14} /></button>
				</div>
				{#if v.url}
					<div class="variant-preview" style="background:{v.background === 'dark' ? '#111' : /^#/.test(v.background) ? v.background : '#fff'}"><img src={v.url} alt="" /></div>
				{/if}
				{#each v.files as f, fi (fi)}
					<div class="list-row">
						<input type="text" value={f.label} placeholder={m.be_file_label()} style="width:140px;flex-shrink:0"
							oninput={e => patchVariant(i, { files: v.files.map((x, j) => j === fi ? { ...x, label: (e.target as HTMLInputElement).value } : x) })} />
						<input type="text" value={f.url} placeholder="/uploads/…" style="flex:1"
							oninput={e => patchVariant(i, { files: v.files.map((x, j) => j === fi ? { ...x, url: (e.target as HTMLInputElement).value } : x) })} />
						<button type="button" class="btn-pick" onclick={() => openPicker(`lv:${i}:${fi}`, 'all')} title={m.editor_pick_asset()}><IconPhoto size={14} /></button>
						<button class="btn-ghost sm danger" onclick={() => patchVariant(i, { files: v.files.filter((_, j) => j !== fi) })} aria-label={m.be_remove_file()}>✕</button>
					</div>
				{/each}
				<button class="btn-add sm-add" onclick={() => patchVariant(i, { files: [...v.files, { label: '', url: '' }] })}>{m.be_add_file()}</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateVariants([...logoVariants, { label: '', url: '', background: logoVariants.length % 2 ? 'dark' : 'light', files: [] }])}>{m.be_add_variant()}</button>
	</div>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
	.input-with-btn {
		display: flex;
		gap: 4px;
		align-items: center;
	}
	.input-with-btn input {
		flex: 1;
		min-width: 0;
	}
	.variant-preview { display: grid; place-items: center; height: 96px; border: 1px solid var(--color-border); border-radius: var(--radius); }
	.variant-preview img { max-width: 70%; max-height: 64px; }
	.sm-add { padding: 4px 8px; font-size: var(--text-xs); }
</style>
