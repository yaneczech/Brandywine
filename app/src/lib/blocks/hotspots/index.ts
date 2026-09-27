import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconPointer } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'hotspots',
	group: 'media',
	order: 20,
	icon: IconPointer,
	Render,
	Editor,
	audit(c, { str, arr, empty, missingAlt, broken, warn, fileExists }) {
		if (!str(c.imageUrl)) empty();
		else {
			if (!fileExists(str(c.imageUrl))) broken(m.audit_what_image());
			if (!str(c.alt)) missingAlt();
			if (!arr(c.points).length) warn('hotspots_none', m.audit_hotspots_none());
		}
	},
	toMarkdown: (c, { str, arr, abs }) => [
		str(c.imageUrl) && `![${str(c.alt)}](${abs(str(c.imageUrl))})`,
		...arr<{ title?: string; text?: string }>(c.points).map((p, i) => `${i + 1}. **${str(p.title)}** ${str(p.text)}`),
	].filter(Boolean).join('\n'),
});
