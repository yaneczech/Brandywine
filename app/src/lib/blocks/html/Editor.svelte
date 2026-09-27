<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, bool, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_html_code()}</span>
		<textarea class="code-area" rows={12} value={str('html')} placeholder="<div>…</div>" oninput={e => setStr(e, 'html')}></textarea>
	</label>
	<label class="field checkbox">
		<input type="checkbox" checked={bool('showPreview', true)} onchange={e => setBool(e, 'showPreview')} />
		<span>{m.be_live_preview()}</span>
	</label>
</div>
