import { defineBlock } from '../define';
import { IconChartRadar } from '$lib/icons';
import Render from './Render.svelte';

export default defineBlock({
	type: 'chart',
	group: 'brand',
	order: 150,
	icon: IconChartRadar,
	Render,
});
