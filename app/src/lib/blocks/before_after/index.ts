import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconArrowsHorizontal } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'before_after',
	group: 'media',
	order: 50,
	icon: IconArrowsHorizontal,
	Render,
	Editor,
	audit(c, { str, empty, broken, fileExists }) {
		if (!str(c.beforeUrl) || !str(c.afterUrl)) empty(m.audit_compare_missing());
		else if (!fileExists(str(c.beforeUrl)) || !fileExists(str(c.afterUrl))) broken(m.audit_what_compare_image());
	},
	toMarkdown: (c, { str, abs }) =>
		[str(c.beforeUrl) && `Before: ${abs(str(c.beforeUrl))}`, str(c.afterUrl) && `After: ${abs(str(c.afterUrl))}`].filter(Boolean).join('\n'),
});
