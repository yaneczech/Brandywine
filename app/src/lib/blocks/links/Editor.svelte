<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray, moveItem } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type LinkItem = { title: string; url: string; description?: string };

	// svelte-ignore state_referenced_locally
	let linkItems = $state<LinkItem[]>(configArray<LinkItem>(cfg, 'items'));
	function updateLinks(items: LinkItem[]) {
		linkItems = items;
		onUpdate({ ...cfg, items: items });
	}
</script>

<div class="list-editor">
	{#each linkItems as item, i (i)}
		<div class="process-row">
			<div class="step-num">{i + 1}</div>
			<div class="step-fields">
				<div class="inline-pair">
					<input type="text" value={item.title} placeholder={m.be_link_title()}
						oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<input type="text" value={item.url} placeholder="https://…"
						oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, url: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<input type="text" value={item.description ?? ''} placeholder={m.be_link_desc()}
					oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, description: (e.target as HTMLInputElement).value } : x))} />
			</div>
			<div class="row-actions">
				<button class="btn-ghost sm" onclick={() => updateLinks(moveItem(linkItems, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
				<button class="btn-ghost sm" onclick={() => updateLinks(moveItem(linkItems, i, i + 1))} disabled={i === linkItems.length - 1} aria-label={m.editor_move_down()}>↓</button>
				<button class="btn-ghost sm danger" onclick={() => updateLinks(linkItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
			</div>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateLinks([...linkItems, { title: '', url: '' }])}>{m.be_add_link()}</button>
</div>
