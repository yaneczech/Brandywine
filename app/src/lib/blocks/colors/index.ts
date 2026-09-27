import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { colorsForSource } from '$lib/manual/color-source';
import { IconPalette } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'colors',
	group: 'brand',
	order: 20,
	icon: IconPalette,
	Render,
	Editor,
	rendersWithoutConfig: true,
	audit(c, { warn, colorRows, palettes }) {
		if (!colorsForSource(colorRows, palettes, c.source).length) warn('no_colors', m.audit_no_colors());
	},
	toMarkdown: (c, { str, colorsMarkdown }) => colorsMarkdown(str(c.source) || 'all'),
});
