import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconPhoto } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'image',
	group: 'media',
	order: 10,
	icon: IconPhoto,
	Render,
	Editor,
	audit(c, { str, empty, missingAlt, broken, fileExists }) {
		if (!str(c.url)) empty();
		else {
			if (!fileExists(str(c.url))) broken(m.audit_what_image());
			if (!str(c.alt)) missingAlt();
		}
	},
	toMarkdown: (c, { str, abs }) =>
		str(c.url) ? `![${str(c.alt)}](${abs(str(c.url))})${str(c.caption) ? `\n\n_${str(c.caption)}_` : ''}` : '',
});
