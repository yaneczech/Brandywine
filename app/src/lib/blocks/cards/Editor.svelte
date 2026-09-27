<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type Card = { title: string; description: string; imageUrl?: string };

	// svelte-ignore state_referenced_locally
	let cards = $state<Card[]>(configArray<Card>(cfg, 'cards'));
	function updateCards(newCards: Card[]) {
		cards = newCards;
		onUpdate({ ...cfg, cards: newCards });
	}
</script>

<div class="list-editor">
{#each cards as card, i (i)}
		<div class="process-row">
			<div class="step-fields">
				<input type="text" value={card.title} placeholder={m.be_title_placeholder()}
					oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
				<textarea rows={2} value={card.description} placeholder={m.be_desc_placeholder()}
					oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
				<input type="text" value={card.imageUrl ?? ''} placeholder={m.be_image_url_optional()}
					oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, imageUrl: (e.target as HTMLInputElement).value } : x))} />
			</div>
			<button class="btn-ghost sm danger" onclick={() => updateCards(cards.filter((_, j) => j !== i))}>✕</button>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateCards([...cards, { title: '', description: '' }])}>{m.be_add_card()}</button>
</div>
