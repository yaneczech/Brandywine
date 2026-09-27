import { defineBlock } from '../define';
import { IconChartPie } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'color_ratio',
	group: 'brand',
	order: 30,
	icon: IconChartPie,
	Render,
	Editor,
	audit(c, { arr, empty }) {
		if (!arr(c.items).length) empty();
	},
	toMarkdown: (c, { arr, colors }) => arr<{ colorId?: string; percent?: number }>(c.items).map((i) => {
		const color = colors.find((x) => x.id === i.colorId);
		return color ? `- ${color.name} (${color.hex.toUpperCase()}): ${Number(i.percent) || 0} %` : '';
	}).filter(Boolean).join('\n'),
});
