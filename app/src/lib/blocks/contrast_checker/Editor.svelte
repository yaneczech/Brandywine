<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<p class="muted" style="font-size:.82rem;margin:0">{m.be_contrast_hint()}</p>
	<div class="fields-row">
		<label class="field">
			<span>{m.be_default_text()}</span>
			<div class="color-row">
				<input type="color" value={str('foreground') || '#171717'} oninput={e => setStr(e, 'foreground')} class="color-swatch" />
				<input type="text" value={str('foreground')} placeholder="#171717" oninput={e => setStr(e, 'foreground')} class="color-text" />
			</div>
		</label>
		<label class="field">
			<span>{m.be_default_bg()}</span>
			<div class="color-row">
				<input type="color" value={str('background') || '#ffffff'} oninput={e => setStr(e, 'background')} class="color-swatch" />
				<input type="text" value={str('background')} placeholder="#ffffff" oninput={e => setStr(e, 'background')} class="color-text" />
			</div>
		</label>
	</div>
	<label class="field">
		<span>{m.be_sample_text()} <span class="muted">{m.common_optional()}</span></span>
		<input type="text" value={str('sample')} placeholder={m.be_sample_text_placeholder()} oninput={e => setStr(e, 'sample')} />
	</label>
</div>
