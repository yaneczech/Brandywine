<script lang="ts">
	import type { BlockEditorProps } from '$lib/blocks/types';
	import { configFields } from '$lib/blocks/_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

<div class="fields">
	<label class="field">
		<span>Text</span>
		<textarea rows={3} value={str('text')} oninput={(e) => setStr(e, 'text')}></textarea>
	</label>
</div>
