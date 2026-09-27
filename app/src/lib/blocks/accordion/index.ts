import { defineBlock } from '../define';
import { IconLayoutList } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'accordion',
	group: 'text',
	order: 50,
	icon: IconLayoutList,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.items).length) empty();
	},
	toMarkdown: (c, { str, arr }) => arr<{ question?: string; answer?: string }>(c.items)
		.map((i) => `**${str(i.question)}**\n${str(i.answer)}`).join('\n\n'),
});
