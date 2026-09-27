import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconLink } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'links',
	group: 'structure',
	order: 40,
	icon: IconLink,
	Render,
	Editor,
	audit(c, { str, arr, empty, warn }) {
		if (!arr(c.items).length) empty();
		if (arr<{ url?: string }>(c.items).some((i) => !str(i.url))) warn('link_no_url', m.audit_link_no_url());
	},
	toMarkdown: (c, { str, arr, abs }) => arr<{ title?: string; url?: string; description?: string }>(c.items)
		.filter((i) => str(i.url))
		.map((i) => `- [${str(i.title) || str(i.url)}](${abs(str(i.url))})${str(i.description) ? ` — ${str(i.description)}` : ''}`).join('\n'),
});
