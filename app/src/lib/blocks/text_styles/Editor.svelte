<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_description()}</span>
		<textarea rows={4} value={str('description')} placeholder={m.be_styles_placeholder()} oninput={e => setStr(e, 'description')}></textarea>
	</label>
</div>
