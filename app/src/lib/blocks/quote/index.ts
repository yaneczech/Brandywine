import { defineBlock } from '../define';
import { IconQuote } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'quote',
	group: 'text',
	order: 30,
	icon: IconQuote,
	Render,
	Editor,
	audit(c, { str, empty }) {
		if (!str(c.quote)) empty();
	},
	toMarkdown: (c, { str }) =>
		str(c.quote) ? `> ${str(c.quote)}${str(c.author) ? `\n>\n> — ${str(c.author)}${str(c.role) ? `, ${str(c.role)}` : ''}` : ''}` : '',
});
