import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { resolveEmbed } from '$lib/manual/embed';
import { IconPlayerPlay } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'embed',
	group: 'media',
	order: 60,
	icon: IconPlayerPlay,
	Render,
	Editor,
	audit(c, { str, empty, warn }) {
		if (!str(c.url)) empty();
		else if (resolveEmbed(c.url).kind === 'none') warn('embed_unsupported', m.audit_embed_unsupported());
	},
	toMarkdown: (c, { str, abs }) => str(c.url) ? `Media: ${abs(str(c.url))}${str(c.caption) ? ` — ${str(c.caption)}` : ''}` : '',
});
