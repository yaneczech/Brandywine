import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconBadge } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'logo_spec',
	group: 'brand',
	order: 80,
	icon: IconBadge,
	Render,
	Editor,
	audit(c, { str, empty, broken, fileExists }) {
		if (!str(c.logoUrl)) empty();
		else if (!fileExists(str(c.logoUrl))) broken(m.audit_what_logo());
	},
	toMarkdown: (c, { str, abs }) => [
		str(c.logoUrl) && `Logo: ${abs(str(c.logoUrl))}`,
		c.clearspace != null && `Clear space: ${c.clearspace}× x-height`,
		c.minSizePx != null && `Minimum size: ${c.minSizePx} px / ${c.minSizeMm ?? '—'} mm`,
		str(c.description),
	].filter(Boolean).join('\n'),
});
