import { defineBlock } from '../define';
import { IconChartRadar } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'chart',
	group: 'brand',
	order: 150,
	icon: IconChartRadar,
	Render,
	Editor,
});
