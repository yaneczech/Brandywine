import { defineBlock } from '../define';
import { IconCode } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'code',
	group: 'advanced',
	order: 20,
	icon: IconCode,
	Render,
	Editor,
	audit(c, { str, empty }) {
		if (!str(c.code)) empty();
	},
	toMarkdown: (c, { str }) => `\`\`\`${str(c.language)}\n${String(c.code ?? '')}\n\`\`\``,
});
