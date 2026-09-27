<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));

	const chartPlaceholder = m.be_chart_placeholder();
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_dataset_label()}</span>
		<input type="text" value={str('datasetLabel')} placeholder="Brand" oninput={e => setStr(e, 'datasetLabel')} />
	</label>
	<label class="field">
		<span>{m.be_axes()} <span class="muted">{m.be_axes_hint()}</span></span>
		<textarea rows={7} value={str('data')} placeholder={chartPlaceholder} oninput={e => setStr(e, 'data')}></textarea>
	</label>
</div>
