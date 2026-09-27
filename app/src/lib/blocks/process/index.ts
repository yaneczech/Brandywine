import { defineBlock } from '../define';
import { IconStairs } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'process',
	group: 'brand',
	order: 140,
	icon: IconStairs,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.steps).length) empty();
	},
	toMarkdown: (c, { str, arr }) => arr<{ title?: string; description?: string }>(c.steps)
		.map((s, i) => `${i + 1}. **${str(s.title)}**${str(s.description) ? ` — ${str(s.description)}` : ''}`).join('\n'),
});
