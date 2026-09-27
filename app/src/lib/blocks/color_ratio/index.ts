import { defineBlock } from '../define';
import { IconChartPie } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'color_ratio',
	group: 'brand',
	order: 30,
	icon: IconChartPie,
	Render,
});
