import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconLayoutColumns } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_image',
	group: 'text',
	order: 20,
	icon: IconLayoutColumns,
	Render,
	Editor,
	audit(c, { str, richHasContent, empty, missingAlt, broken, warn, fileExists }) {
		if (!richHasContent(c) && !str(c.title) && !str(c.imageUrl)) empty();
		if (str(c.imageUrl)) {
			if (!fileExists(str(c.imageUrl))) broken(m.audit_what_image());
			if (!str(c.alt)) missingAlt();
		}
		if (str(c.ctaLabel) && !str(c.ctaUrl)) warn('cta_no_url', m.audit_cta_no_url());
	},
	toMarkdown: (c, { str, richContent, abs }) => [
		str(c.title) && `**${str(c.title)}**`,
		richContent(c),
		str(c.imageUrl) && `![${str(c.alt)}](${abs(str(c.imageUrl))})`,
		str(c.ctaUrl) && `[${str(c.ctaLabel) || str(c.ctaUrl)}](${abs(str(c.ctaUrl))})`,
	].filter(Boolean).join('\n\n'),
});
