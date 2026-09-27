import { defineBlock } from '../define';
import * as m from '$lib/paraglide/messages';
import { IconTableOptions } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'font_usage',
	group: 'brand',
	order: 60,
	icon: IconTableOptions,
	Render,
	Editor,
	audit(c, { arr, empty, warn, fontRows }) {
		if (!arr(c.rows).length) empty();
		if (!fontRows.length) warn('no_fonts', m.audit_no_fonts());
	},
	toMarkdown(c, { str, arr, table, fonts: allFonts }) {
		const rows = arr<{ label?: string; fontIds?: string[] }>(c.rows);
		const fonts = allFonts.filter((f) => rows.some((r) => r.fontIds?.includes(f.id)));
		return table(['Use', ...fonts.map((f) => f.name)], rows.map((r) => [str(r.label), ...fonts.map((f) => (r.fontIds?.includes(f.id) ? 'yes' : 'no'))]));
	},
});
