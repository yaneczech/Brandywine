import { defineBlock } from '../define';
import { IconGridDots } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'grid',
	group: 'brand',
	order: 90,
	icon: IconGridDots,
	Render,
	Editor,
	rendersWithoutConfig: true,
	toMarkdown: (c, { str }) =>
		`Layout grid: ${c.columns ?? 12} columns, gutter ${c.gutter ?? 24}, margins ${c.margin ?? 40} ${str(c.unit) || (str(c.medium) === 'print' ? 'mm' : 'px')}${str(c.format) ? `, format ${str(c.format)}` : ''}.${str(c.description) ? ` ${str(c.description)}` : ''}`,
});
