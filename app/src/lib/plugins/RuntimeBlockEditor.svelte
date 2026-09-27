<!--
  Editor of a runtime-plugin block: a form generated from the manifest's
  fields, or the plugin's own editor custom element (`editorElement`), which
  receives the config as its `config` property and emits `change` events
  with the new config in `detail`.
-->
<script lang="ts">
	import type { BlockEditorProps } from '$lib/blocks/types';
	import { configFields } from '$lib/blocks/_shared/editor';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';
	import { getLocale } from '$lib/paraglide/runtime';
	import { localize, runtimeBlockSpec } from './runtime';

	const { block, cfg, onUpdate }: BlockEditorProps = $props();
	const { str, num, bool, set, setStr, setNum, setBool } = configFields(() => cfg, (next) => onUpdate(next));
	const spec = $derived(runtimeBlockSpec(block.type));
	const locale = getLocale();

	let pickerFor = $state<string | null>(null);

	// Custom editor element
	let el = $state<HTMLElement | null>(null);
	$effect(() => {
		if (!el) return;
		(el as HTMLElement & { config: unknown }).config = cfg;
	});
	$effect(() => {
		if (!el) return;
		const onChange = (e: Event) => {
			const next = (e as CustomEvent).detail;
			if (next && typeof next === 'object') onUpdate(next as Record<string, unknown>);
		};
		el.addEventListener('change', onChange);
		return () => el?.removeEventListener('change', onChange);
	});
</script>

{#if spec?.editorElement}
	<svelte:element this={spec.editorElement} bind:this={el}></svelte:element>
{:else if spec}
	<div class="fields">
		{#each spec.fields ?? [] as field (field.key)}
			{@const label = localize(field.label, locale)}
			{@const hint = localize(field.hint, locale)}
			{#if field.type === 'image'}
				<ImageField {label} {hint} value={str(field.key)} onChoose={() => (pickerFor = field.key)} onChange={(v) => set(field.key, v)} />
			{:else if field.type === 'boolean'}
				<label class="field checkbox">
					<input type="checkbox" checked={bool(field.key, field.default === true)} onchange={(e) => setBool(e, field.key)} />
					<span>{label}</span>
				</label>
			{:else}
				<label class="field">
					<span>{label}</span>
					{#if field.type === 'textarea'}
						<textarea rows={4} value={str(field.key) || String(field.default ?? '')} oninput={(e) => setStr(e, field.key)}></textarea>
					{:else if field.type === 'select'}
						<select value={str(field.key) || String(field.default ?? field.options?.[0]?.value ?? '')} onchange={(e) => setStr(e, field.key)}>
							{#each field.options ?? [] as option (option.value)}
								<option value={option.value}>{localize(option.label, locale)}</option>
							{/each}
						</select>
					{:else if field.type === 'number'}
						<input type="number" value={num(field.key, Number(field.default ?? 0))} oninput={(e) => setNum(e, field.key)} />
					{:else if field.type === 'color'}
						<input type="color" value={str(field.key) || String(field.default ?? '#000000')} oninput={(e) => setStr(e, field.key)} />
					{:else}
						<input type={field.type === 'url' ? 'url' : 'text'} value={str(field.key) || String(field.default ?? '')} oninput={(e) => setStr(e, field.key)} />
					{/if}
					{#if hint}<small class="muted">{hint}</small>{/if}
				</label>
			{/if}
		{/each}
	</div>

	<AssetPickerModal
		open={pickerFor !== null}
		mimeFilter="image"
		onPick={(url) => { if (pickerFor) set(pickerFor, url); pickerFor = null; }}
		onClose={() => (pickerFor = null)}
	/>
{/if}
