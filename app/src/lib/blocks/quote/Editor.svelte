<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_quote()}</span>
		<textarea rows={3} value={str('quote')} placeholder={m.be_quote_placeholder()} oninput={e => setStr(e, 'quote')}></textarea>
	</label>
	<div class="fields-row">
		<label class="field">
			<span>{m.be_author()} <span class="muted">{m.common_optional()}</span></span>
			<input type="text" value={str('author')} placeholder={m.be_name()} oninput={e => setStr(e, 'author')} />
		</label>
		<label class="field">
			<span>{m.be_role()} <span class="muted">{m.common_optional()}</span></span>
			<input type="text" value={str('role')} placeholder="CEO, Brand strategy 2026" oninput={e => setStr(e, 'role')} />
		</label>
		<label class="field">
			<span>{m.be_size()}</span>
			<select value={str('size') || 'large'} onchange={e => setStr(e, 'size')}>
				<option value="large">{m.be_size_claim()}</option>
				<option value="normal">{m.be_size_quote()}</option>
			</select>
		</label>
	</div>
</div>
