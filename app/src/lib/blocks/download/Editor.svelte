<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import FolderField from '../_shared/FolderField.svelte';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, set, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_description()}</span>
		<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
	</label>
	<FolderField label={m.be_folder()} value={str('folderId')} emptyLabel={m.be_all_folders()} includeRoot rootLabel={m.be_all_folders()} onChange={(id) => set('folderId', id)} />
	<label class="field">
		<span>{m.assets_upload_tags()} <span class="muted">{m.assets_upload_tags_hint()}</span></span>
		<input type="text" value={str('tags')} placeholder="logo, vector, print" oninput={e => setStr(e, 'tags')} />
	</label>
</div>
