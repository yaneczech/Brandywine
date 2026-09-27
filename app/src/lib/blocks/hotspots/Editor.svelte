<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields, configArray } from '../_shared/editor';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, bool, set, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));

	type Hotspot = { x: number; y: number; title: string; text: string };

	// svelte-ignore state_referenced_locally
	let hotspots = $state<Hotspot[]>(configArray<Hotspot>(cfg, 'points'));
	function updateHotspots(points: Hotspot[]) {
		hotspots = points;
		onUpdate({ ...cfg, points: points });
	}
	function addHotspotAt(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
		const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
		updateHotspots([...hotspots, { x, y, title: '', text: '' }]);
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
	<ImageField label={m.be_image()} value={str('imageUrl')} onChoose={() => openPicker('imageUrl')} onChange={(v) => set('imageUrl', v)} />
	{#if str('imageUrl')}
		<p class="muted" style="font-size:.8rem;margin:0">{m.be_hotspot_hint()}</p>
		<button type="button" class="hs-editor-stage" onclick={addHotspotAt} aria-label={m.be_hotspot_aria()}>
			<img src={str('imageUrl')} alt="" />
			{#each hotspots as p, i (i)}
				<span class="hs-editor-dot" style="left:{p.x}%;top:{p.y}%">{i + 1}</span>
			{/each}
		</button>
	{/if}
	<label class="field">
		<span>{m.be_alt()}</span>
		<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
	</label>
	<div class="list-editor">
		{#each hotspots as p, i (i)}
			<div class="process-row">
				<div class="step-num">{i + 1}</div>
				<div class="step-fields">
					<input type="text" value={p.title} placeholder={m.be_hotspot_title()}
						oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={p.text} placeholder={m.be_explanation()}
						oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, text: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
					<div class="inline-pair">
						<input type="number" min="0" max="100" step="0.5" value={p.x} aria-label="X %"
							oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, x: Number((e.target as HTMLInputElement).value) } : x))} />
						<input type="number" min="0" max="100" step="0.5" value={p.y} aria-label="Y %"
							oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, y: Number((e.target as HTMLInputElement).value) } : x))} />
					</div>
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateHotspots(hotspots.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
			</div>
		{/each}
	</div>
	<label class="field checkbox">
		<input type="checkbox" checked={bool('showList', true)} onchange={e => setBool(e, 'showList')} />
		<span>{m.be_hotspot_list()}</span>
	</label>
</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
	.hs-editor-stage { position: relative; display: block; width: 100%; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius); background: none; cursor: crosshair; overflow: hidden; }
	.hs-editor-stage img { display: block; width: 100%; height: auto; }
	.hs-editor-dot { position: absolute; display: grid; place-items: center; width: 24px; height: 24px; transform: translate(-50%, -50%); border: 2px solid #fff; border-radius: 50%; background: var(--color-accent); color: var(--color-accent-contrast); font-size: var(--text-2xs); font-weight: 600; pointer-events: none; }
</style>
