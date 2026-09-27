<script lang="ts">
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import RichContentEditor from '$lib/components/admin/RichContentEditor.svelte';

	const { block, cfg, onUpdate }: BlockEditorProps = $props();
	const { str } = configFields(() => cfg, (next) => onUpdate(next));

	function updateRichContent(items: unknown[]) {
		const next = { ...cfg, content: items };
		delete (next as Record<string, unknown>)['markdown'];
		onUpdate(next);
	}
</script>

{#key block.id}
	<RichContentEditor
		value={cfg['content']}
		legacyMarkdown={str('markdown')}
		onChange={updateRichContent}
	/>
{/key}
