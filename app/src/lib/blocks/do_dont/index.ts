import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconThumbUp } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'do_dont',
	group: 'brand',
	order: 100,
	icon: IconThumbUp,
	Render,
	Editor,
	audit(c, { str, arr, empty, broken, fileExists }) {
		if (!arr(c.items).length) empty();
		for (const item of arr<{ imageUrl?: string }>(c.items)) {
			if (str(item.imageUrl) && !fileExists(str(item.imageUrl))) broken(m.audit_what_item_image());
		}
	},
	toMarkdown: (c, { str, arr }) => arr<{ type?: string; text?: string }>(c.items)
		.map((i) => `- ${i.type === 'dont' ? "❌ Don't" : '✅ Do'}: ${str(i.text)}`).join('\n'),
});
