<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, num, setStr, setNum } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields fields-row">
	<label class="field">
		<span>{m.be_style()}</span>
		<select value={str('style') || 'line'} onchange={e => setStr(e, 'style')}>
			<option value="line">{m.be_line()}</option>
			<option value="space">{m.be_space_only()}</option>
			<option value="dots">{m.be_dots()}</option>
		</select>
	</label>
	<label class="field">
		<span>{m.be_height_rem()}</span>
		<input type="number" step={0.5} min={1} max={20} value={num('spacing', 4)} oninput={e => setNum(e, 'spacing')} />
	</label>
</div>
