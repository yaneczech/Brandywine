import { defineBlock } from '../define';
import { IconTableOptions } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'font_usage',
	group: 'brand',
	order: 60,
	icon: IconTableOptions,
	Render,
});
