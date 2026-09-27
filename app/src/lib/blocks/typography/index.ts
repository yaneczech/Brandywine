import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconTypography } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'typography',
	group: 'brand',
	order: 50,
	icon: IconTypography,
	Render,
	Editor,
	rendersWithoutConfig: true,
	audit(_c, { warn, fontRows }) {
		if (!fontRows.length) warn('no_fonts', m.audit_no_fonts());
	},
	toMarkdown: (c, { arr, typographyMarkdown }) => typographyMarkdown(arr<string>(c.fontIds)),
});
