<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type AccordionItem = { question: string; answer: string };

	// svelte-ignore state_referenced_locally
	let accordionItems = $state<AccordionItem[]>(configArray<AccordionItem>(cfg, 'items'));
	function updateAccordion(newItems: AccordionItem[]) {
		accordionItems = newItems;
		onUpdate({ ...cfg, items: newItems });
	}
</script>

<div class="list-editor">
{#each accordionItems as item, i (i)}
		<div class="process-row">
			<div class="step-fields">
				<input type="text" value={item.question} placeholder={m.be_question()}
					oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, question: (e.target as HTMLInputElement).value } : x))} />
				<textarea rows={2} value={item.answer} placeholder={m.be_answer()}
					oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, answer: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
			</div>
			<button class="btn-ghost sm danger" onclick={() => updateAccordion(accordionItems.filter((_, j) => j !== i))}>✕</button>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateAccordion([...accordionItems, { question: '', answer: '' }])}>{m.be_add_item()}</button>
</div>
