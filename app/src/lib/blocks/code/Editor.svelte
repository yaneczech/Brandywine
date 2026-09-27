<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_language()}</span>
		<select value={str('language') || 'text'} onchange={e => setStr(e, 'language')}>
			<option value="html">HTML</option>
			<option value="css">CSS</option>
			<option value="javascript">JavaScript</option>
			<option value="typescript">TypeScript</option>
			<option value="json">JSON</option>
			<option value="bash">Bash</option>
			<option value="text">{m.be_plain_text()}</option>
		</select>
	</label>
	<label class="field">
		<span>{m.be_code()}</span>
		<textarea class="code-area" rows={10} value={str('code')} placeholder={m.be_code_placeholder()} oninput={e => setStr(e, 'code')}></textarea>
	</label>
</div>
