import { defineBlock } from '../define';
import { IconChartRadar } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'chart',
	group: 'brand',
	order: 150,
	icon: IconChartRadar,
	Render,
	Editor,
	audit(c, { str, empty }) {
		if (!str(c.data)) empty();
	},
	toMarkdown: (c, { str }) => str(c.data).split('\n').filter(Boolean).map((l) => `- ${l.trim()}`).join('\n'),
});
