<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import FolderField from '../_shared/FolderField.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, num, set, setStr, setNum } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<FolderField label={m.be_icon_folder()} value={str('folderId')} onChange={(id) => set('folderId', id)} />
	<div class="fields-row">
		<label class="field">
			<span>{m.be_preview_size()}</span>
			<input type="number" min={16} max={128} value={num('size', 32)} oninput={e => setNum(e, 'size')} />
		</label>
	</div>
	<label class="field">
		<span>{m.be_description()}</span>
		<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
	</label>
</div>
