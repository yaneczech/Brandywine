import { defineBlock } from '../define';
import { IconCards } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'cards',
	group: 'structure',
	order: 10,
	icon: IconCards,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.cards).length) empty();
	},
	toMarkdown: (c, { str, arr }) => arr<{ title?: string; description?: string }>(c.cards)
		.map((i) => `- **${str(i.title)}** — ${str(i.description)}`).join('\n'),
});
