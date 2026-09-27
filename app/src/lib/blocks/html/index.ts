import { defineBlock } from '../define';
import { IconBrackets } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'html',
	group: 'advanced',
	order: 10,
	icon: IconBrackets,
	Render,
	Editor,
	audit(c, { str, empty }) {
		if (!str(c.html)) empty();
	},
	toMarkdown: (c, { str }) => str(c.html) ? `\`\`\`html\n${String(c.html)}\n\`\`\`` : '',
});
