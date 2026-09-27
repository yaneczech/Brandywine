import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconLetterCase } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'text_styles',
	group: 'brand',
	order: 70,
	icon: IconLetterCase,
	Render,
	Editor,
	rendersWithoutConfig: true,
	audit(_c, { warn, fontRows }) {
		if (!fontRows.length) warn('no_fonts', m.audit_no_fonts());
	},
	toMarkdown: (_c, { typographyMarkdown }) => typographyMarkdown(),
});
