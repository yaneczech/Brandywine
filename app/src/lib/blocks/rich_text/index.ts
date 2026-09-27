import { defineBlock } from '../define';
import { IconAlignLeft } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'rich_text',
	group: 'text',
	order: 10,
	icon: IconAlignLeft,
	Render,
	Editor,
	audit(c, { richHasContent, empty }) {
		if (!richHasContent(c)) empty();
	},
	toMarkdown: (c, { richContent }) => richContent(c),
});
