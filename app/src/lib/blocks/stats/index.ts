import { defineBlock } from '../define';
import { IconNumbers } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'stats',
	group: 'structure',
	order: 20,
	icon: IconNumbers,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.items).length) empty();
	},
	toMarkdown: (c, { str, arr }) => arr<{ value?: string; label?: string; description?: string }>(c.items)
		.map((i) => `- **${str(i.value)}** ${str(i.label)}${str(i.description) ? ` — ${str(i.description)}` : ''}`).join('\n'),
});
