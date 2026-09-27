<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import FolderField from '../_shared/FolderField.svelte';

	const { block, cfg, onUpdate }: BlockEditorProps = $props();
	const { str, bool, set, setBool } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<FolderField label={m.be_image_folder()} value={str('folderId')} onChange={(id) => set('folderId', id)} />
	{#if block.type === 'carousel'}
		<label class="field checkbox">
			<input type="checkbox" checked={bool('autoplay')} onchange={e => setBool(e, 'autoplay')} />
			<span>{m.be_autoplay()}</span>
		</label>
	{/if}
</div>
